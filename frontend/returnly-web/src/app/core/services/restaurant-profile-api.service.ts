import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';
import {
  RestaurantProfileApiResponse,
  RestaurantProfileDto,
  UpdateRestaurantProfileRequest,
} from '../models/restaurant-profile.model';

@Injectable({ providedIn: 'root' })
export class RestaurantProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:5230/api/restaurant-profile';
  private readonly profileState = signal<RestaurantProfileDto | null>(null);
  readonly profile = this.profileState.asReadonly();

  getProfile(): Observable<RestaurantProfileApiResponse<RestaurantProfileDto>> {
    return this.authorized((headers) =>
      this.http.get<RestaurantProfileApiResponse<RestaurantProfileDto>>(this.url, { headers }))
      .pipe(tap((response) => this.profileState.set(response.data)));
  }

  updateProfile(request: UpdateRestaurantProfileRequest):
    Observable<RestaurantProfileApiResponse<RestaurantProfileDto>> {
    return this.authorized((headers) =>
      this.http.put<RestaurantProfileApiResponse<RestaurantProfileDto>>(this.url, request, { headers }))
      .pipe(tap((response) => this.profileState.set(response.data)));
  }

  private authorized<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const token = globalThis.localStorage?.getItem('returnly_token')
      ?? globalThis.sessionStorage?.getItem('returnly_token')
      ?? globalThis.localStorage?.getItem('token');
    return token
      ? request(new HttpHeaders({ Authorization: `Bearer ${token}` }))
      : throwError(() => new Error('No Returnly access token is available.'));
  }
}
