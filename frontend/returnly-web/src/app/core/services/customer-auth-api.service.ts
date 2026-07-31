import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CustomerAuthApiResponse,
  CustomerVerificationChallengeDto,
  CustomerVerificationResultDto,
  RequestCustomerVerificationCode,
  VerifyCustomerCodeRequest,
} from '../models/customer-auth.model';
import { CustomerPortalApiService } from './customer-portal-api.service';

@Injectable({ providedIn: 'root' })
export class CustomerAuthApiService {
  private readonly http = inject(HttpClient);
  private readonly customerPortalApi = inject(CustomerPortalApiService);
  private readonly baseUrl = 'http://192.168.0.109:5230/api/public/customer-auth';

  requestCode(
    request: RequestCustomerVerificationCode,
  ): Observable<CustomerAuthApiResponse<CustomerVerificationChallengeDto>> {
    return this.http.post<CustomerAuthApiResponse<CustomerVerificationChallengeDto>>(
      `${this.baseUrl}/request-code`,
      request,
    );
  }

  verifyCode(
    request: VerifyCustomerCodeRequest,
  ): Observable<CustomerAuthApiResponse<CustomerVerificationResultDto>> {
    return this.http.post<CustomerAuthApiResponse<CustomerVerificationResultDto>>(
      `${this.baseUrl}/verify-code`,
      request,
      { withCredentials: true },
    );
  }

  resendCode(
    challengeId: string,
  ): Observable<CustomerAuthApiResponse<CustomerVerificationChallengeDto>> {
    return this.http.post<CustomerAuthApiResponse<CustomerVerificationChallengeDto>>(
      `${this.baseUrl}/resend-code`,
      { challengeId },
    );
  }

  trustedScan(
    qrToken: string,
  ): Observable<CustomerAuthApiResponse<CustomerVerificationResultDto>> {
    const token = this.customerPortalApi.getAccessToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
    return this.http.post<CustomerAuthApiResponse<CustomerVerificationResultDto>>(
      `${this.baseUrl}/trusted-scan`,
      { qrToken },
      {
        headers,
        withCredentials: true,
      },
    );
  }
}
