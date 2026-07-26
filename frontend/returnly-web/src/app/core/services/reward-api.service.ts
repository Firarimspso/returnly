import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject, isDevMode } from '@angular/core';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import {
  RewardApiResponse,
  RewardDto,
  RewardPagedResponse,
  RewardQuery,
  RewardUpsertRequest,
} from '../models/reward.model';

@Injectable({ providedIn: 'root' })
export class RewardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5230/api/rewards';
  private readonly loginUrl = 'http://localhost:5230/api/auth/login';

  getRewards(query: RewardQuery = {}): Observable<RewardApiResponse<RewardPagedResponse<RewardDto>>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 100);

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.isActive !== undefined) {
      params = params.set('isActive', query.isActive);
    }
    if (query.category) {
      params = params.set('category', query.category);
    }

    return this.withAuthorization((headers) =>
      this.http.get<RewardApiResponse<RewardPagedResponse<RewardDto>>>(
        this.baseUrl,
        { params, headers },
      ));
  }

  getReward(id: string): Observable<RewardApiResponse<RewardDto>> {
    return this.withAuthorization((headers) =>
      this.http.get<RewardApiResponse<RewardDto>>(`${this.baseUrl}/${id}`, { headers }));
  }

  createReward(request: RewardUpsertRequest): Observable<RewardApiResponse<RewardDto>> {
    return this.withAuthorization((headers) =>
      this.http.post<RewardApiResponse<RewardDto>>(this.baseUrl, request, { headers }));
  }

  updateReward(id: string, request: RewardUpsertRequest): Observable<RewardApiResponse<RewardDto>> {
    return this.withAuthorization((headers) =>
      this.http.put<RewardApiResponse<RewardDto>>(`${this.baseUrl}/${id}`, request, { headers }));
  }

  deleteReward(id: string): Observable<void> {
    return this.withAuthorization((headers) =>
      this.http.delete<void>(`${this.baseUrl}/${id}`, { headers }));
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
