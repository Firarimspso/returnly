import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CustomerLoginApiResponse,
  CustomerLoginChallengeDto,
  CustomerLoginResultDto,
} from '../models/customer-login.model';

@Injectable({ providedIn: 'root' })
export class CustomerLoginApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://192.168.0.109:5230/api/public/customer-login';

  requestCode(email: string): Observable<CustomerLoginApiResponse<CustomerLoginChallengeDto>> {
    return this.http.post<CustomerLoginApiResponse<CustomerLoginChallengeDto>>(
      `${this.baseUrl}/request-code`, { email });
  }

  resendCode(challengeId: string): Observable<CustomerLoginApiResponse<CustomerLoginChallengeDto>> {
    return this.http.post<CustomerLoginApiResponse<CustomerLoginChallengeDto>>(
      `${this.baseUrl}/resend-code`, { challengeId });
  }

  verifyCode(challengeId: string, verificationCode: string): Observable<CustomerLoginApiResponse<CustomerLoginResultDto>> {
    return this.http.post<CustomerLoginApiResponse<CustomerLoginResultDto>>(
      `${this.baseUrl}/verify-code`,
      { challengeId, verificationCode },
      { withCredentials: true });
  }

  selectRestaurant(selectionToken: string, customerKey: string): Observable<CustomerLoginApiResponse<CustomerLoginResultDto>> {
    return this.http.post<CustomerLoginApiResponse<CustomerLoginResultDto>>(
      `${this.baseUrl}/select-restaurant`,
      { selectionToken, customerKey },
      { withCredentials: true });
  }
}
