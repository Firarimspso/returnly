import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  ApiResponse,
  CustomerDto,
  CustomerQuery,
  CustomerUpsertRequest,
  PagedResponse,
} from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5230/api/customers';

  getCustomers(query: CustomerQuery = {}): Observable<ApiResponse<PagedResponse<CustomerDto>>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 100);

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    return this.withAuthorization((headers) =>
      this.http.get<ApiResponse<PagedResponse<CustomerDto>>>(this.baseUrl, { params, headers }));
  }

  getCustomer(id: string): Observable<ApiResponse<CustomerDto>> {
    return this.withAuthorization((headers) =>
      this.http.get<ApiResponse<CustomerDto>>(`${this.baseUrl}/${id}`, { headers }));
  }

  createCustomer(request: CustomerUpsertRequest): Observable<ApiResponse<CustomerDto>> {
    return this.withAuthorization((headers) =>
      this.http.post<ApiResponse<CustomerDto>>(this.baseUrl, request, { headers }));
  }

  updateCustomer(id: string, request: CustomerUpsertRequest): Observable<ApiResponse<CustomerDto>> {
    return this.withAuthorization((headers) =>
      this.http.put<ApiResponse<CustomerDto>>(`${this.baseUrl}/${id}`, request, { headers }));
  }

  deleteCustomer(id: string): Observable<void> {
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
