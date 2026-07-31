import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AuthApiResponse,
  AuthenticatedUser,
  LoginRequest,
  LoginResponse,
} from '../models/auth.model';

const TOKEN_KEY = 'returnly_token';
const USER_KEY = 'returnly_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly loginUrl = 'http://localhost:5230/api/auth/login';
  private readonly userState = signal<AuthenticatedUser | null>(this.readUser());

  readonly user = this.userState.asReadonly();
  readonly authenticated = computed(
    () => this.userState() !== null && this.hasValidToken(),
  );

  login(request: LoginRequest): Observable<AuthApiResponse<LoginResponse>> {
    return this.http
      .post<AuthApiResponse<LoginResponse>>(this.loginUrl, request)
      .pipe(tap((response) => this.storeSession(response.data)));
  }

  logout(): void {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    globalThis.localStorage?.removeItem(USER_KEY);
    globalThis.sessionStorage?.removeItem(TOKEN_KEY);
    globalThis.localStorage?.removeItem('token');
    this.userState.set(null);
  }

  hasValidToken(): boolean {
    const token = this.accessToken();
    if (!token) return false;

    const expiresAt = this.tokenExpiry(token);
    if (expiresAt === null || expiresAt <= Date.now()) {
      this.logout();
      return false;
    }
    return true;
  }

  private storeSession(response: LoginResponse): void {
    globalThis.localStorage?.setItem(TOKEN_KEY, response.token);
    globalThis.localStorage?.setItem(USER_KEY, JSON.stringify(response.user));
    this.userState.set(response.user);
  }

  private accessToken(): string | null {
    return globalThis.localStorage?.getItem(TOKEN_KEY)
      ?? globalThis.sessionStorage?.getItem(TOKEN_KEY)
      ?? globalThis.localStorage?.getItem('token')
      ?? null;
  }

  private tokenExpiry(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
      return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private readUser(): AuthenticatedUser | null {
    try {
      const stored = globalThis.localStorage?.getItem(USER_KEY);
      return stored ? JSON.parse(stored) as AuthenticatedUser : null;
    } catch {
      globalThis.localStorage?.removeItem(USER_KEY);
      return null;
    }
  }
}
