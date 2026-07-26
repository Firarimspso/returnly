import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, isDevMode } from '@angular/core';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import { DashboardAnalyticsApiResponse } from '../models/dashboard-analytics.model';

@Injectable({ providedIn: 'root' })
export class DashboardAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly analyticsUrl = 'http://localhost:5230/api/dashboard/analytics';
  private readonly loginUrl = 'http://localhost:5230/api/auth/login';

  getAnalytics(): Observable<DashboardAnalyticsApiResponse> {
    return this.withAuthorization((headers) =>
      this.http.get<DashboardAnalyticsApiResponse>(this.analyticsUrl, { headers }));
  }

  private withAuthorization<T>(
    request: (headers: HttpHeaders) => Observable<T>,
  ): Observable<T> {
    const storedToken = this.accessToken();
    if (storedToken) {
      return request(this.bearerHeaders(storedToken)).pipe(
        catchError((error: unknown) => {
          if (isDevMode() && error instanceof HttpErrorResponse && error.status === 401) {
            this.clearAccessToken();
            return this.developmentLoginAndRetry(request);
          }

          return throwError(() => error);
        }),
      );
    }

    if (!isDevMode()) {
      return throwError(() => new Error('No Returnly access token is available.'));
    }

    return this.developmentLoginAndRetry(request);
  }

  private developmentLoginAndRetry<T>(
    request: (headers: HttpHeaders) => Observable<T>,
  ): Observable<T> {
    return this.http.post<LoginApiResponse>(this.loginUrl, {
      email: 'admin@solemaple.com',
      password: 'ReturnlyDemo123!',
    }).pipe(
      tap((response) => globalThis.localStorage?.setItem('returnly_token', response.data.token)),
      switchMap((response) => request(this.bearerHeaders(response.data.token))),
    );
  }

  private clearAccessToken(): void {
    globalThis.localStorage?.removeItem('returnly_token');
    globalThis.sessionStorage?.removeItem('returnly_token');
    globalThis.localStorage?.removeItem('token');
  }

  private accessToken(): string | null {
    return globalThis.localStorage?.getItem('returnly_token')
      ?? globalThis.sessionStorage?.getItem('returnly_token')
      ?? globalThis.localStorage?.getItem('token')
      ?? null;
  }

  private bearerHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}

interface LoginApiResponse {
  data: {
    token: string;
  };
  message: string | null;
}
