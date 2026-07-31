import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthApiResponse, LoginResponse } from '../models/auth.model';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  const loginResponse: AuthApiResponse<LoginResponse> = {
    data: {
      token: createToken(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'user-id',
        restaurantId: 'restaurant-id',
        firstName: 'Adam',
        lastName: 'Miller',
        email: 'admin@solemaple.com',
        role: 'Admin',
        restaurantName: 'Solé & Maple',
      },
    },
    message: 'Login successful.',
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores the JWT and authenticated user after login', () => {
    auth.login({
      email: 'admin@solemaple.com',
      password: 'ReturnlyDemo123!',
    }).subscribe();

    const request = http.expectOne('http://localhost:5230/api/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush(loginResponse);

    expect(localStorage.getItem('returnly_token')).toBe(loginResponse.data.token);
    expect(auth.user()?.email).toBe('admin@solemaple.com');
    expect(auth.hasValidToken()).toBe(true);
  });

  it('clears the session during logout', () => {
    localStorage.setItem('returnly_token', loginResponse.data.token);
    localStorage.setItem('returnly_user', JSON.stringify(loginResponse.data.user));

    auth.logout();

    expect(localStorage.getItem('returnly_token')).toBeNull();
    expect(localStorage.getItem('returnly_user')).toBeNull();
    expect(auth.user()).toBeNull();
  });
});

function createToken(expiresAt: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1000) }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}
