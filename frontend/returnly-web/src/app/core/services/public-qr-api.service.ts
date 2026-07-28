import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PublicQrCodeDto,
  PublicQrScanRequest,
  PublicQrScanResultDto,
  QrCodeApiResponse,
} from '../models/qr-code.model';

@Injectable({ providedIn: 'root' })
export class PublicQrApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://192.168.0.109:5230/api/public/qr';

  validate(token: string): Observable<QrCodeApiResponse<PublicQrCodeDto>> {
    return this.http.get<QrCodeApiResponse<PublicQrCodeDto>>(
      `${this.baseUrl}/${encodeURIComponent(token)}`,
    );
  }

  scan(
    token: string,
    request: PublicQrScanRequest,
  ): Observable<QrCodeApiResponse<PublicQrScanResultDto>> {
    return this.http.post<QrCodeApiResponse<PublicQrScanResultDto>>(
      `${this.baseUrl}/${encodeURIComponent(token)}/scan`,
      request,
    );
  }
}
