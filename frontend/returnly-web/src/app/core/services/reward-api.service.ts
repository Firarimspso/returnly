import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
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
