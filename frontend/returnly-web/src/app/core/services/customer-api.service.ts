import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject, isDevMode } from '@angular/core';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
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
  private readonly loginUrl = 'http://localhost:5230/api/auth/login';

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
