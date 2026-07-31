import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, ElementRef, inject, isDevMode, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  PublicQrCodeDto,
  PublicQrScanResultDto,
} from '../core/models/qr-code.model';
import { PublicQrApiService } from '../core/services/public-qr-api.service';
import { CustomerPortalApiService } from '../core/services/customer-portal-api.service';
import { CustomerAuthApiService } from '../core/services/customer-auth-api.service';
import {
  CustomerVerificationChallengeDto,
  CustomerVerificationResultDto,
} from '../core/models/customer-auth.model';

type ScanState = 'validating' | 'identify' | 'requesting-code' | 'verify' | 'verifying' | 'submitting' | 'success' | 'error';
type ScanErrorKind = 'invalid' | 'inactive' | 'expired' | 'duplicate' | 'connection';
type IdentifierMode = 'phone' | 'email';

export function shouldDiscardTrustedCustomerSession(
  status: number,
  code: string,
  trustedScanInProgress: boolean,
): boolean {
  return trustedScanInProgress
    && (status === 401 || (status === 404 && code === 'qr_not_found'));
}

@Component({
  selector: 'app-customer-scan-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './customer-scan.html',
})
export class CustomerScanPage {
  private readonly route = inject(ActivatedRoute);
  private readonly publicQrApi = inject(PublicQrApiService);
  private readonly customerAuthApi = inject(CustomerAuthApiService);
  private readonly customerPortalApi = inject(CustomerPortalApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly token = this.route.snapshot.paramMap.get('token')?.trim() ?? '';

  protected readonly restaurantName = signal('Returnly Restaurant');
  protected readonly qrCode = signal<PublicQrCodeDto | null>(null);
  protected readonly identifierMode = signal<IdentifierMode>('email');
  protected readonly identifier = signal('');
  protected readonly state = signal<ScanState>('validating');
  protected readonly errorMessage = signal('');
  protected readonly errorKind = signal<ScanErrorKind>('connection');
  protected readonly result = signal<PublicQrScanResultDto | null>(null);
  protected readonly challenge = signal<CustomerVerificationChallengeDto | null>(null);
  protected readonly otpDigits = signal<string[]>(Array<string>(6).fill(''));
  protected readonly secondsUntilExpiry = signal(0);
  protected readonly secondsUntilResend = signal(0);
  protected readonly resendPending = signal(false);
  protected readonly displayedPointsAwarded = signal(0);
  protected readonly displayedBalance = signal(0);
  private animationFrames: number[] = [];
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  protected readonly verificationCode = computed(() => this.otpDigits().join(''));
  protected readonly expiryLabel = computed(() => this.formatCountdown(this.secondsUntilExpiry()));
  protected readonly restaurantInitials = computed(() => {
    const words = this.restaurantName().trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'R';
  });
  protected readonly errorTitle = computed(() => ({
    invalid: 'This code is not available',
    inactive: 'Scanning is paused',
    expired: 'This code has expired',
    duplicate: 'You’re already checked in',
    connection: 'We hit a connection snag',
  })[this.errorKind()]);
  protected readonly errorIcon = computed(() => ({
    invalid: '⌁',
    inactive: 'Ⅱ',
    expired: '◷',
    duplicate: '✓',
    connection: '↻',
  })[this.errorKind()]);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.animationFrames.forEach((frame) => globalThis.cancelAnimationFrame?.(frame));
      if (this.countdownTimer) clearInterval(this.countdownTimer);
    });
    if (!this.token) {
      this.showError('This QR code link is incomplete. Please scan the code again.', 'invalid');
      return;
    }
    this.validateQrCode();
  }

  protected submit(): void {
    const identifier = this.identifier().trim();
    const normalizedIdentifier = this.normalizedIdentifier(identifier);
    if (!normalizedIdentifier) {
      return;
    }

    this.state.set('requesting-code');
    this.errorMessage.set('');
    this.customerAuthApi.requestCode({
      qrToken: this.token,
      channel: this.identifierMode() === 'email' ? 'Email' : 'Phone',
      identifier: normalizedIdentifier,
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.state() === 'requesting-code') this.state.set('identify');
        }),
      )
      .subscribe({
        next: (response) => {
          this.challenge.set(response.data);
          this.otpDigits.set(Array<string>(6).fill(''));
          this.startCountdown();
          this.state.set('verify');
          setTimeout(() => this.focusOtp(0));
        },
        error: (error: unknown) => this.handleApiError(error),
      });
  }

  protected verifyCode(): void {
    const challenge = this.challenge();
    if (!challenge || this.verificationCode().length !== 6) return;

    this.state.set('verifying');
    this.errorMessage.set('');
    this.customerAuthApi.verifyCode({
      challengeId: challenge.challengeId,
      verificationCode: this.verificationCode(),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (this.state() === 'verifying') this.state.set('verify');
      }),
    ).subscribe({
      next: (response) => this.completeScan(response.data),
      error: (error: unknown) => this.handleApiError(error),
    });
  }

  protected resendCode(): void {
    const challenge = this.challenge();
    if (!challenge || this.secondsUntilResend() > 0 || this.resendPending()) return;
    this.resendPending.set(true);
    this.errorMessage.set('');
    this.customerAuthApi.resendCode(challenge.challengeId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.resendPending.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.challenge.set(response.data);
          this.otpDigits.set(Array<string>(6).fill(''));
          this.startCountdown();
          setTimeout(() => this.focusOtp(0));
        },
        error: (error: unknown) => this.handleApiError(error),
      });
  }

  protected changeIdentifier(): void {
    this.challenge.set(null);
    this.otpDigits.set(Array<string>(6).fill(''));
    this.errorMessage.set('');
    this.state.set('identify');
  }

  protected updateOtpDigit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (digits.length > 1) {
      this.applyPastedCode(digits);
      return;
    }
    const next = [...this.otpDigits()];
    next[index] = digits;
    this.otpDigits.set(next);
    input.value = digits;
    this.errorMessage.set('');
    if (digits && index < 5) this.focusOtp(index + 1);
    if (this.verificationCode().length === 6) this.verifyCode();
  }

  protected otpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits()[index] && index > 0) {
      this.focusOtp(index - 1);
    }
    if (event.key === 'ArrowLeft' && index > 0) this.focusOtp(index - 1);
    if (event.key === 'ArrowRight' && index < 5) this.focusOtp(index + 1);
  }

  protected pasteOtp(event: ClipboardEvent): void {
    event.preventDefault();
    this.applyPastedCode(event.clipboardData?.getData('text') ?? '');
  }

  protected tryAgain(): void {
    this.errorMessage.set('');
    this.validateQrCode();
  }

  protected selectIdentifierMode(mode: IdentifierMode): void {
    this.identifierMode.set(mode);
    this.identifier.set('');
    this.errorMessage.set('');
  }

  private validateQrCode(): void {
    this.state.set('validating');
    this.publicQrApi.validate(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.qrCode.set(response.data);
          this.restaurantName.set(response.data.restaurantName);
          // Always try the trusted endpoint after public validation. A durable
          // HttpOnly cookie may still exist when Safari or an embedded QR browser
          // does not expose the JavaScript storage used by the bearer fallback.
          this.customerPortalApi.hasValidAccessToken();
          this.scanWithTrustedSession();
        },
        error: (error: unknown) => this.handleApiError(error),
      });
  }

  private handleApiError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const code = typeof error.error?.code === 'string' ? error.error.code : '';
      if (shouldDiscardTrustedCustomerSession(
        error.status,
        code,
        this.state() === 'submitting',
      )) {
        if (isDevMode()) {
          console.info('[DEV CUSTOMER SESSION] trusted-scan fell back to OTP', {
            status: error.status,
            code,
            reason: error.status === 401
              ? 'customer session missing, expired, or invalid'
              : 'customer session belongs to a different restaurant',
            frontendHost: globalThis.location?.origin,
          });
        }
        // A valid customer session can belong to another restaurant. The public QR
        // was already validated, so discard that tenant-bound session and verify
        // this customer instead of incorrectly declaring the QR unavailable.
        this.customerPortalApi.clearAccessToken();
        this.state.set('identify');
        return;
      }
      if (code === 'invalid_code') {
        this.state.set('verify');
        this.errorMessage.set(error.error?.detail ?? 'That code is not correct. Please try again.');
        return;
      }
      if (code === 'code_expired' || code === 'code_used' || code === 'too_many_attempts') {
        this.state.set('verify');
        this.errorMessage.set(error.error?.detail ?? 'This verification code is no longer available.');
        return;
      }
      if (code === 'resend_cooldown' || code === 'resend_limit') {
        this.state.set('verify');
        this.errorMessage.set(error.error?.detail ?? 'Please wait before requesting another code.');
        return;
      }
      if (code === 'channel_unavailable') {
        this.state.set('identify');
        this.errorMessage.set('SMS verification is coming soon. Please use email.');
        return;
      }
      if (code === 'qr_inactive' || error.status === 409) {
        this.showError('This QR code is currently inactive. Please ask the restaurant team for assistance.', 'inactive');
        return;
      }
      if (code === 'qr_expired' || error.status === 410) {
        this.showError('This QR code has expired. Please ask the restaurant team for a new one.', 'expired');
        return;
      }
      if (code === 'duplicate_scan' || error.status === 429) {
        this.showError('Your points from this QR code were already added today. Come back tomorrow!', 'duplicate');
        return;
      }
      if (code === 'customer_not_found') {
        this.state.set('identify');
        this.errorMessage.set('We could not find a rewards profile with that phone number or email.');
        return;
      }
      if (error.status === 404) {
        this.showError('This QR code is invalid or is no longer available. Please ask the restaurant team for help.', 'invalid');
        return;
      }
    }

    this.showError('We could not connect to Returnly right now. Check your connection and try again.', 'connection');
  }

  private normalizedIdentifier(value: string): string | null {
    if (this.identifierMode() === 'email') {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return value.toLowerCase();
      }
      this.errorMessage.set('Enter a valid email address.');
      return null;
    }

    this.errorMessage.set('SMS verification is coming soon. Please use email.');
    return null;
  }

  private scanWithTrustedSession(): void {
    this.state.set('submitting');
    if (isDevMode()) {
      console.info('[DEV CUSTOMER SESSION] attempting trusted-scan', {
        bearerStorageAvailable: this.customerPortalApi.hasValidAccessToken(),
        cookieCredentialsEnabled: true,
        frontendHost: globalThis.location?.origin,
        apiHost: 'http://192.168.0.109:5230',
      });
    }
    this.customerAuthApi.trustedScan(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.completeScan(response.data),
        error: (error: unknown) => this.handleApiError(error),
      });
  }

  private completeScan(response: CustomerVerificationResultDto): void {
    const scan: PublicQrScanResultDto = {
      restaurantName: response.restaurantName,
      restaurantLogoUrl: response.restaurantLogoUrl,
      primaryBrandColor: response.primaryBrandColor,
      customerFirstName: response.customer.firstName,
      pointsAwarded: response.pointsAwarded,
      currentPoints: response.currentPoints,
      scannedAt: response.scannedAt,
      customerPortalToken: response.customerPortalToken,
      customerPortalTokenExpiresAt: response.customerPortalTokenExpiresAt,
    };
    this.result.set(scan);
    this.customerPortalApi.storeAccessToken(response.customerPortalToken);
    if (isDevMode()) {
      console.info('[DEV CUSTOMER SESSION] customer portal token stored', {
        expiresAt: response.customerPortalTokenExpiresAt,
        storageKey: 'returnly_customer_portal_token',
      });
    }
    this.restaurantName.set(response.restaurantName);
    this.state.set('success');
    this.animateNumber(response.pointsAwarded, this.displayedPointsAwarded);
    this.animateNumber(response.currentPoints, this.displayedBalance);
  }

  private applyPastedCode(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 6).split('');
    this.otpDigits.set(Array.from({ length: 6 }, (_, index) => digits[index] ?? ''));
    this.errorMessage.set('');
    this.focusOtp(Math.min(digits.length, 5));
    if (digits.length === 6) this.verifyCode();
  }

  private focusOtp(index: number): void {
    this.host.nativeElement.querySelectorAll<HTMLInputElement>('.otp-input')[index]?.focus();
  }

  private startCountdown(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    const update = (): void => {
      const challenge = this.challenge();
      if (!challenge) return;
      const now = Date.now();
      this.secondsUntilExpiry.set(Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000)));
      this.secondsUntilResend.set(Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000)));
    };
    update();
    this.countdownTimer = setInterval(update, 1000);
  }

  private formatCountdown(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  private showError(message: string, kind: ScanErrorKind): void {
    this.errorMessage.set(message);
    this.errorKind.set(kind);
    this.state.set('error');
  }

  private animateNumber(target: number, destination: { set(value: number): void }): void {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || !globalThis.requestAnimationFrame) {
      destination.set(target);
      return;
    }

    const startedAt = globalThis.performance.now();
    const duration = 720;
    const update = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      destination.set(Math.round(target * eased));
      if (progress < 1) {
        this.animationFrames.push(globalThis.requestAnimationFrame(update));
      }
    };
    this.animationFrames.push(globalThis.requestAnimationFrame(update));
  }
}
