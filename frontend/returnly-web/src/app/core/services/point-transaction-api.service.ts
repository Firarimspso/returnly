import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  CreatePointTransactionRequest,
  PointTransactionApiResponse,
  PointTransactionDto,
  PointTransactionPagedResponse,
  PointTransactionQuery,
} from '../models/point-transaction.model';

@Injectable({ providedIn: 'root' })
export class PointTransactionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5230/api/point-transactions';

  getTransactions(
    query: PointTransactionQuery = {},
  ): Observable<PointTransactionApiResponse<PointTransactionPagedResponse<PointTransactionDto>>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 100);

    if (query.customerId) {
      params = params.set('customerId', query.customerId);
    }
    if (query.type) {
      params = params.set('type', query.type);
    }
    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    return this.withAuthorization((headers) =>
      this.http.get<PointTransactionApiResponse<PointTransactionPagedResponse<PointTransactionDto>>>(
        this.baseUrl,
        { params, headers },
      ));
  }

  earnPoints(
    request: CreatePointTransactionRequest,
  ): Observable<PointTransactionApiResponse<PointTransactionDto>> {
    return this.withAuthorization((headers) =>
      this.http.post<PointTransactionApiResponse<PointTransactionDto>>(
        `${this.baseUrl}/earn`,
        request,
        { headers },
      ));
  }

  redeemPoints(
    request: CreatePointTransactionRequest,
  ): Observable<PointTransactionApiResponse<PointTransactionDto>> {
    return this.withAuthorization((headers) =>
      this.http.post<PointTransactionApiResponse<PointTransactionDto>>(
        `${this.baseUrl}/redeem`,
        request,
        { headers },
      ));
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
