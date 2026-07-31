import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  CreateQrCodeRequest,
  QrCodeApiResponse,
  QrCodeDto,
  QrCodePagedResponse,
  QrCodeQuery,
  QrCodeScanResultDto,
  ScanQrCodeRequest,
  SetQrCodeStatusRequest,
} from '../models/qr-code.model';

@Injectable({ providedIn: 'root' })
export class QrCodeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5230/api/qr-codes';

  getQrCodes(query: QrCodeQuery = {}): Observable<QrCodeApiResponse<QrCodePagedResponse<QrCodeDto>>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 100);

    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.isActive !== undefined) params = params.set('isActive', query.isActive);
    if (query.type) params = params.set('type', query.type);

    return this.withAuthorization((headers) =>
      this.http.get<QrCodeApiResponse<QrCodePagedResponse<QrCodeDto>>>(
        this.baseUrl,
        { params, headers },
      ));
  }

  createQrCode(request: CreateQrCodeRequest): Observable<QrCodeApiResponse<QrCodeDto>> {
    return this.withAuthorization((headers) =>
      this.http.post<QrCodeApiResponse<QrCodeDto>>(this.baseUrl, request, { headers }));
  }

  setStatus(id: string, request: SetQrCodeStatusRequest): Observable<QrCodeApiResponse<QrCodeDto>> {
    return this.withAuthorization((headers) =>
      this.http.patch<QrCodeApiResponse<QrCodeDto>>(
        `${this.baseUrl}/${id}/status`,
        request,
        { headers },
      ));
  }

  deleteQrCode(id: string): Observable<void> {
    return this.withAuthorization((headers) =>
      this.http.delete<void>(`${this.baseUrl}/${id}`, { headers }));
  }

  scanQrCode(request: ScanQrCodeRequest): Observable<QrCodeApiResponse<QrCodeScanResultDto>> {
    return this.withAuthorization((headers) =>
      this.http.post<QrCodeApiResponse<QrCodeScanResultDto>>(
        `${this.baseUrl}/scan`,
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
