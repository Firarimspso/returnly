import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { DashboardAnalyticsApiResponse } from '../models/dashboard-analytics.model';

export type DashboardAnalyticsPeriod = 'Today' | 'Last7Days' | 'Last30Days' | 'AllTime';

@Injectable({ providedIn: 'root' })
export class DashboardAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly analyticsUrl = 'http://localhost:5230/api/dashboard/analytics';

  getAnalytics(period: DashboardAnalyticsPeriod = 'Last30Days'): Observable<DashboardAnalyticsApiResponse> {
    const params = new HttpParams().set('period', period);
    return this.withAuthorization((headers) =>
      this.http.get<DashboardAnalyticsApiResponse>(this.analyticsUrl, { headers, params }));
  }

  private withAuthorization<T>(
    request: (headers: HttpHeaders) => Observable<T>,
  ): Observable<T> {
    const token = this.accessToken();
    return token
      ? request(this.bearerHeaders(token))
      : throwError(() => new Error('No Returnly access token is available.'));
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
