import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import {
  PublicQrCodeDto,
  PublicQrScanResultDto,
} from '../core/models/qr-code.model';
import { PublicQrApiService } from '../core/services/public-qr-api.service';

type ScanState = 'validating' | 'identify' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-customer-scan-page',
  imports: [FormsModule],
  templateUrl: './customer-scan.html',
  styleUrl: './customer-scan.scss',
})
export class CustomerScanPage {
  private readonly route = inject(ActivatedRoute);
  private readonly publicQrApi = inject(PublicQrApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token = this.route.snapshot.paramMap.get('token')?.trim() ?? '';

  protected readonly restaurantName = signal('Returnly Restaurant');
  protected readonly qrCode = signal<PublicQrCodeDto | null>(null);
  protected readonly identifier = signal('');
  protected readonly state = signal<ScanState>('validating');
  protected readonly errorMessage = signal('');
  protected readonly result = signal<PublicQrScanResultDto | null>(null);

  constructor() {
    if (!this.token) {
      this.showError('This QR code link is incomplete. Please scan the code again.');
      return;
    }
    this.validateQrCode();
  }

  protected submit(): void {
    const identifier = this.identifier().trim();
    if (!this.isValidIdentifier(identifier)) {
      this.errorMessage.set('Enter a valid email address or phone number.');
      return;
    }

    this.state.set('submitting');
    this.errorMessage.set('');
    this.publicQrApi.scan(this.token, { identifier })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.state() === 'submitting') this.state.set('identify');
        }),
      )
      .subscribe({
        next: (response) => {
          this.result.set(response.data);
          this.restaurantName.set(response.data.restaurantName);
          this.state.set('success');
        },
        error: (error: unknown) => this.handleApiError(error),
      });
  }

  protected tryAgain(): void {
    this.errorMessage.set('');
    this.validateQrCode();
  }

  private validateQrCode(): void {
    this.state.set('validating');
    this.publicQrApi.validate(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.qrCode.set(response.data);
          this.restaurantName.set(response.data.restaurantName);
          this.state.set('identify');
        },
        error: (error: unknown) => this.handleApiError(error),
      });
  }

  private handleApiError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const code = typeof error.error?.code === 'string' ? error.error.code : '';
      if (code === 'qr_inactive' || error.status === 409) {
        this.showError('This QR code is currently inactive. Please ask the restaurant for assistance.');
        return;
      }
      if (code === 'qr_expired' || error.status === 410) {
        this.showError('This QR code has expired. Please ask the restaurant for a new code.');
        return;
      }
      if (code === 'duplicate_scan' || error.status === 429) {
        this.showError('You already received points from this QR code today. Come back tomorrow!');
        return;
      }
      if (code === 'customer_not_found') {
        this.state.set('identify');
        this.errorMessage.set('We could not find a rewards profile with that phone number or email.');
        return;
      }
      if (error.status === 404) {
        this.showError('This QR code is invalid or has been deleted. Please ask the restaurant for a new code.');
        return;
      }
    }

    this.showError('We could not connect to Returnly right now. Please try again shortly.');
  }

  private isValidIdentifier(value: string): boolean {
    if (value.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return value.replace(/\D/g, '').length >= 7;
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.state.set('error');
  }
}
