import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CustomerPortalApiService } from '../core/services/customer-portal-api.service';
import {
  CustomerScanPage,
  shouldDiscardTrustedCustomerSession,
} from './customer-scan';

const portalTokenKey = 'returnly_customer_portal_token';
const publicQrUrl = 'http://192.168.0.109:5230/api/public/qr/fresh-token';
const trustedScanUrl =
  'http://192.168.0.109:5230/api/public/customer-auth/trusted-scan';
const requestCodeUrl =
  'http://192.168.0.109:5230/api/public/customer-auth/request-code';
const verifyCodeUrl =
  'http://192.168.0.109:5230/api/public/customer-auth/verify-code';

interface WritableSignal<T> {
  (): T;
  set(value: T): void;
}

interface ScanPageHarness {
  identifier: WritableSignal<string>;
  otpDigits: WritableSignal<string[]>;
  state: WritableSignal<string>;
  submit(): void;
  verifyCode(): void;
}

describe('customer trusted-session lifecycle', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<CustomerScanPage>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CustomerScanPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (name: string) => name === 'token' ? 'fresh-token' : null,
              },
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores the trusted session after successful OTP verification', () => {
    fixture = TestBed.createComponent(CustomerScanPage);
    const page = fixture.componentInstance as unknown as ScanPageHarness;
    completePublicValidation();
    rejectTrustedSession(401, '');

    page.identifier.set('customer@example.com');
    page.submit();
    const codeRequest = http.expectOne(requestCodeUrl);
    expect(codeRequest.request.body).toEqual({
      qrToken: 'fresh-token',
      channel: 'Email',
      identifier: 'customer@example.com',
    });
    codeRequest.flush({
      data: {
        challengeId: 'challenge-id',
        message: 'A code has been sent.',
        maskedDestination: 'cu***@example.com',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
      },
      message: null,
    });

    page.otpDigits.set(['1', '2', '3', '4', '5', '6']);
    page.verifyCode();
    const token = createToken(Date.now() + 86_400_000, 'restaurant-a');
    const verifyRequest = http.expectOne(verifyCodeUrl);
    expect(verifyRequest.request.withCredentials).toBe(true);
    verifyRequest.flush(verificationResponse(token, 'Restaurant A'));

    expect(localStorage.getItem(portalTokenKey)).toBe(token);
    expect(sessionStorage.getItem(portalTokenKey)).toBe(token);
    expect(page.state()).toBe('success');
  });

  it('restores a later same-restaurant session, calls trusted-scan, and skips OTP', () => {
    const token = createToken(Date.now() + 86_400_000, 'restaurant-a');
    localStorage.setItem(portalTokenKey, token);

    fixture = TestBed.createComponent(CustomerScanPage);
    const page = fixture.componentInstance as unknown as ScanPageHarness;
    completePublicValidation('Restaurant A');

    const trustedRequest = http.expectOne(trustedScanUrl);
    expect(trustedRequest.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(trustedRequest.request.withCredentials).toBe(true);
    trustedRequest.flush(verificationResponse(token, 'Restaurant A'));

    expect(page.state()).toBe('success');
    http.expectNone(requestCodeUrl);
  });

  it('uses the Safari HttpOnly-cookie fallback when JavaScript storage is empty', () => {
    fixture = TestBed.createComponent(CustomerScanPage);
    const page = fixture.componentInstance as unknown as ScanPageHarness;
    completePublicValidation('Restaurant A');

    const trustedRequest = http.expectOne(trustedScanUrl);
    expect(trustedRequest.request.headers.has('Authorization')).toBe(false);
    expect(trustedRequest.request.withCredentials).toBe(true);
    trustedRequest.flush(verificationResponse(
      createToken(Date.now() + 86_400_000, 'restaurant-a'),
      'Restaurant A'));

    expect(page.state()).toBe('success');
    http.expectNone(requestCodeUrl);
  });

  it('clears a tenant-mismatched session and shows OTP identification', () => {
    const token = createToken(Date.now() + 86_400_000, 'restaurant-a');
    localStorage.setItem(portalTokenKey, token);
    sessionStorage.setItem(portalTokenKey, token);

    fixture = TestBed.createComponent(CustomerScanPage);
    const page = fixture.componentInstance as unknown as ScanPageHarness;
    completePublicValidation('Restaurant B');
    rejectTrustedSession(404, 'qr_not_found');

    expect(localStorage.getItem(portalTokenKey)).toBeNull();
    expect(sessionStorage.getItem(portalTokenKey)).toBeNull();
    expect(page.state()).toBe('identify');
  });

  it.each([
    ['expired', createToken(Date.now() - 60_000, 'restaurant-a')],
    ['invalid', 'not-a-valid-jwt'],
  ])('falls back to OTP for an %s stored session', (_label, token) => {
    localStorage.setItem(portalTokenKey, token);

    fixture = TestBed.createComponent(CustomerScanPage);
    const page = fixture.componentInstance as unknown as ScanPageHarness;
    completePublicValidation('Restaurant A');

    const trustedRequest = http.expectOne(trustedScanUrl);
    expect(trustedRequest.request.headers.has('Authorization')).toBe(false);
    expect(trustedRequest.request.withCredentials).toBe(true);
    rejectRequest(trustedRequest, 401, '');

    expect(localStorage.getItem(portalTokenKey)).toBeNull();
    expect(page.state()).toBe('identify');
  });

  it('classifies only trusted-scan tenant failures as session mismatches', () => {
    expect(shouldDiscardTrustedCustomerSession(404, 'qr_not_found', true)).toBe(true);
    expect(shouldDiscardTrustedCustomerSession(401, '', true)).toBe(true);
    expect(shouldDiscardTrustedCustomerSession(404, 'qr_not_found', false)).toBe(false);
  });

  function completePublicValidation(restaurantName = 'Restaurant A'): void {
    http.expectOne(publicQrUrl).flush({
      data: {
        restaurantName,
        restaurantLogoUrl: null,
        restaurantCoverImageUrl: null,
        restaurantDescription: 'Welcome',
        primaryBrandColor: '#6952e8',
        qrCodeName: 'Counter',
        type: 'General',
        pointsPerScan: 10,
        expiresAt: null,
      },
      message: null,
    });
  }

  function rejectTrustedSession(status: number, code: string): void {
    rejectRequest(http.expectOne(trustedScanUrl), status, code);
  }
});

function rejectRequest(
  request: TestRequest,
  status: number,
  code: string,
): void {
  request.flush(
    { title: 'Customer verification', status, code },
    { status, statusText: status === 401 ? 'Unauthorized' : 'Not Found' },
  );
}

function verificationResponse(token: string, restaurantName: string) {
  return {
    data: {
      customerPortalToken: token,
      customerPortalTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      customer: {
        id: 'customer-id',
        firstName: 'Customer',
        maskedIdentifier: 'cu***@example.com',
      },
      restaurantName,
      restaurantLogoUrl: null,
      primaryBrandColor: '#6952e8',
      pointsAwarded: 10,
      currentPoints: 50,
      scannedAt: new Date().toISOString(),
    },
    message: null,
  };
}

function createToken(expiresAt: number, restaurantId: string): string {
  const payload = globalThis.btoa(JSON.stringify({
    exp: Math.floor(expiresAt / 1000),
    restaurant_id: restaurantId,
  }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}
