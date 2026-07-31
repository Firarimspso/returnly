import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminRedemptionRequestDto,
  ConfirmedRedemptionDto,
  RedemptionApiResponse,
  RedemptionPagedResponse,
  RedemptionRequestQuery,
} from '../models/redemption-request.model';

@Injectable({ providedIn: 'root' })
export class RedemptionRequestApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5230/api/redemption-requests';

  getRequests(
    query: RedemptionRequestQuery = {},
  ): Observable<RedemptionApiResponse<RedemptionPagedResponse<AdminRedemptionRequestDto>>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 20);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', query.status);

    return this.http.get<RedemptionApiResponse<RedemptionPagedResponse<AdminRedemptionRequestDto>>>(
      this.baseUrl,
      { params },
    );
  }

  confirm(code: string): Observable<RedemptionApiResponse<ConfirmedRedemptionDto>> {
    return this.http.post<RedemptionApiResponse<ConfirmedRedemptionDto>>(
      `${this.baseUrl}/confirm`,
      { confirmationCode: code.trim().toUpperCase() },
    );
  }
}
