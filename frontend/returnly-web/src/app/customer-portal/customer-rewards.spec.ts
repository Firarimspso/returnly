import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerPortalApiService } from '../core/services/customer-portal-api.service';
import { CustomerRewardsPage } from './customer-rewards';

interface RewardsHarness {
  endCustomerSession(focusEmail?: boolean): void;
}

describe('customer rewards account controls', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<CustomerRewardsPage>;
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    router.navigate.mockReset();
    TestBed.configureTestingModule({
      imports: [CustomerRewardsPage],
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

  it('logs out the customer, clears both customer stores, and preserves the admin session', () => {
    const portalApi = TestBed.inject(CustomerPortalApiService);
    portalApi.storeAccessToken('customer-token');
    localStorage.setItem('returnly_token', 'admin-token');
    localStorage.setItem('returnly_user', '{"email":"owner@example.com"}');
    fixture = TestBed.createComponent(CustomerRewardsPage);
    http.expectOne('http://192.168.0.109:5230/api/public/customer-portal')
      .flush({ data: portalDto(), message: null });

    (fixture.componentInstance as unknown as RewardsHarness).endCustomerSession();
    const logout = http.expectOne('http://192.168.0.109:5230/api/public/customer-auth/logout');
    expect(logout.request.withCredentials).toBe(true);
    logout.flush({ data: true, message: 'Customer session ended.' });

    expect(localStorage.getItem('returnly_customer_portal_token')).toBeNull();
    expect(sessionStorage.getItem('returnly_customer_portal_token')).toBeNull();
    expect(localStorage.getItem('returnly_token')).toBe('admin-token');
    expect(localStorage.getItem('returnly_user')).toBe('{"email":"owner@example.com"}');
    expect(router.navigate).toHaveBeenCalledWith(['/my-rewards'], { queryParams: undefined });
  });

  it('switch account ends the session and asks the login page to focus email', () => {
    fixture = TestBed.createComponent(CustomerRewardsPage);
    http.expectOne('http://192.168.0.109:5230/api/public/customer-portal')
      .flush({ data: portalDto(), message: null });

    (fixture.componentInstance as unknown as RewardsHarness).endCustomerSession(true);
    http.expectOne('http://192.168.0.109:5230/api/public/customer-auth/logout')
      .flush({ data: true, message: 'Customer session ended.' });

    expect(router.navigate).toHaveBeenCalledWith(['/my-rewards'], {
      queryParams: { focus: 'email' },
    });
  });
});

function portalDto() {
  return {
    restaurantName: 'Solé & Maple', restaurantLogoUrl: null,
    restaurantCoverImageUrl: null, restaurantDescription: null,
    primaryBrandColor: '#6952e8', customerFirstName: 'Firas',
    currentPoints: 155, rewards: [], recentTransactions: [], previousRedemptions: [],
  };
}
