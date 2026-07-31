import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerLoginPage } from './customer-login';

interface Signal<T> { (): T; set(value: T): void }
interface Harness {
  email: Signal<string>;
  digits: Signal<string[]>;
  state: Signal<string>;
  requestCode(): void;
  verify(): void;
}

describe('standalone customer rewards login', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<CustomerLoginPage>;
  const router = { navigateByUrl: vi.fn() };

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    router.navigateByUrl.mockReset();
    TestBed.configureTestingModule({
      imports: [CustomerLoginPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
    TestBed.resetTestingModule();
  });

  it('opens the wallet immediately when the trusted session is valid', () => {
    fixture = TestBed.createComponent(CustomerLoginPage);
    const request = http.expectOne('http://192.168.0.109:5230/api/public/customer-portal');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ data: portalDto(), message: null });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/rewards');
    http.expectNone('http://192.168.0.109:5230/api/public/customer-login/request-code');
  });

  it('falls back to email OTP when no trusted session is accepted', () => {
    fixture = TestBed.createComponent(CustomerLoginPage);
    const page = fixture.componentInstance as unknown as Harness;
    http.expectOne('http://192.168.0.109:5230/api/public/customer-portal')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(page.state()).toBe('email');
  });

  it('stores the portal token and opens rewards after correct OTP', () => {
    fixture = TestBed.createComponent(CustomerLoginPage);
    const page = fixture.componentInstance as unknown as Harness;
    http.expectOne('http://192.168.0.109:5230/api/public/customer-portal')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    page.email.set('member@example.com');
    page.requestCode();
    http.expectOne('http://192.168.0.109:5230/api/public/customer-login/request-code')
      .flush({ data: challengeDto(), message: null });
    page.digits.set(['1', '2', '3', '4', '5', '6']);
    page.verify();
    const verifyRequest = http.expectOne('http://192.168.0.109:5230/api/public/customer-login/verify-code');
    expect(verifyRequest.request.withCredentials).toBe(true);
    verifyRequest.flush({ data: loginResult(), message: null });

    expect(localStorage.getItem('returnly_customer_portal_token')).toBe('portal-token');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/rewards');
  });
});

function challengeDto() {
  return {
    challengeId: 'challenge-id',
    message: 'Code sent.',
    maskedDestination: 'me***@example.com',
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

function loginResult() {
  return {
    status: 'Authenticated',
    customerPortalToken: 'portal-token',
    customerPortalTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    selectionToken: null,
    selectionExpiresAt: null,
    restaurants: [],
  };
}

function portalDto() {
  return {
    restaurantName: 'Restaurant', restaurantLogoUrl: null,
    restaurantCoverImageUrl: null, restaurantDescription: null,
    primaryBrandColor: '#6952e8', customerFirstName: 'Member',
    currentPoints: 10, rewards: [], recentTransactions: [], previousRedemptions: [],
  };
}
