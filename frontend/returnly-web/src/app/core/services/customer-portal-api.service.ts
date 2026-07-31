import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CustomerPortalApiResponse,
  CustomerPortalDto,
  RedemptionRequestDto,
} from '../models/customer-portal.model';

const PORTAL_TOKEN_KEY = 'returnly_customer_portal_token';
const MULTIPLE_MEMBERSHIPS_KEY = 'returnly_customer_multiple_memberships';

@Injectable({ providedIn: 'root' })
export class CustomerPortalApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://192.168.0.109:5230/api/public/customer-portal';
  private readonly authUrl = 'http://192.168.0.109:5230/api/public/customer-auth';
  private memoryToken: string | null = null;
  private readonly multipleMembershipsState = signal(this.readMultipleMemberships());

  readonly hasMultipleMemberships = this.multipleMembershipsState.asReadonly();

  storeAccessToken(token: string): void {
    this.memoryToken = token;
    this.writeStorage(globalThis.localStorage, token);
    this.writeStorage(globalThis.sessionStorage, token);
  }

  clearAccessToken(): void {
    this.memoryToken = null;
    this.removeStorage(globalThis.localStorage);
    this.removeStorage(globalThis.sessionStorage);
  }

  setMultipleMemberships(value: boolean): void {
    this.multipleMembershipsState.set(value);
    try {
      value
        ? globalThis.localStorage?.setItem(MULTIPLE_MEMBERSHIPS_KEY, 'true')
        : globalThis.localStorage?.removeItem(MULTIPLE_MEMBERSHIPS_KEY);
    } catch {
      // The signal remains authoritative when browser storage is unavailable.
    }
  }

  logout(): Observable<CustomerPortalApiResponse<boolean>> {
    return this.http.post<CustomerPortalApiResponse<boolean>>(
      `${this.authUrl}/logout`,
      {},
      { withCredentials: true },
    );
  }

  clearCustomerSession(): void {
    this.clearAccessToken();
    this.setMultipleMemberships(false);
  }

  getAccessToken(): string | null {
    if (this.memoryToken) return this.memoryToken;

    const persisted = this.readStorage(globalThis.localStorage)
      ?? this.readStorage(globalThis.sessionStorage);
    this.memoryToken = persisted;
    return persisted;
  }

  hasValidAccessToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const segment = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
      if (!segment) {
        this.clearAccessToken();
        return false;
      }
      const payload = JSON.parse(
        globalThis.atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, '=')),
      ) as { exp?: number };
      const isValid = typeof payload.exp === 'number'
        && payload.exp * 1000 > Date.now();
      if (!isValid) this.clearAccessToken();
      return isValid;
    } catch {
      this.clearAccessToken();
      return false;
    }
  }

  getPortal(): Observable<CustomerPortalApiResponse<CustomerPortalDto>> {
    const headers = this.authorizationHeaders();
    return this.http.get<CustomerPortalApiResponse<CustomerPortalDto>>(
      this.baseUrl,
      { headers, withCredentials: true },
    );
  }

  requestRedemption(
    rewardId: string,
  ): Observable<CustomerPortalApiResponse<RedemptionRequestDto>> {
    const headers = this.authorizationHeaders();
    return this.http.post<CustomerPortalApiResponse<RedemptionRequestDto>>(
      `${this.baseUrl}/redemptions`,
      { rewardId },
      { headers, withCredentials: true },
    );
  }

  private authorizationHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  private readStorage(storage: Storage | undefined): string | null {
    try {
      return storage?.getItem(PORTAL_TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private writeStorage(storage: Storage | undefined, token: string): void {
    try {
      storage?.setItem(PORTAL_TOKEN_KEY, token);
    } catch {
      // Safari private mode and embedded browsers may deny persistent storage.
      // The in-memory token and HttpOnly API cookie remain available fallbacks.
    }
  }

  private removeStorage(storage: Storage | undefined): void {
    try {
      storage?.removeItem(PORTAL_TOKEN_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }

  private readMultipleMemberships(): boolean {
    try {
      return globalThis.localStorage?.getItem(MULTIPLE_MEMBERSHIPS_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
