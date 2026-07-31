import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CustomerLoginChallengeDto, CustomerLoginResultDto } from '../core/models/customer-login.model';
import { CustomerLoginApiService } from '../core/services/customer-login-api.service';
import { CustomerPortalApiService } from '../core/services/customer-portal-api.service';

type LoginState = 'restoring' | 'email' | 'sending' | 'code' | 'verifying' | 'restaurants' | 'empty';

@Component({
  selector: 'app-customer-login-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './customer-login.html',
  styleUrl: './customer-login.scss',
})
export class CustomerLoginPage {
  private readonly api = inject(CustomerLoginApiService);
  private readonly portalApi = inject(CustomerPortalApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoginState>('restoring');
  protected readonly email = signal('');
  protected readonly challenge = signal<CustomerLoginChallengeDto | null>(null);
  protected readonly digits = signal<string[]>(Array<string>(6).fill(''));
  protected readonly result = signal<CustomerLoginResultDto | null>(null);
  protected readonly error = signal('');
  protected readonly resendSeconds = signal(0);
  protected readonly selectingKey = signal<string | null>(null);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.destroyRef.onDestroy(() => this.timer && clearInterval(this.timer));
    this.restoreSession();
  }

  protected requestCode(): void {
    const email = this.email().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }
    this.state.set('sending');
    this.error.set('');
    this.api.requestCode(email)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
        if (this.state() === 'sending') this.state.set('email');
      }))
      .subscribe({
        next: response => this.openChallenge(response.data),
        error: () => {
          this.state.set('email');
          this.error.set('We could not send a code right now. Please try again.');
        },
      });
  }

  protected updateDigit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    if (value.length > 1) {
      this.applyCode(value);
      return;
    }
    const next = [...this.digits()];
    next[index] = value;
    this.digits.set(next);
    input.value = value;
    this.error.set('');
    if (value && index < 5) this.focus(index + 1);
  }

  protected keydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) this.focus(index - 1);
  }

  protected paste(event: ClipboardEvent): void {
    event.preventDefault();
    this.applyCode(event.clipboardData?.getData('text') ?? '');
  }

  protected verify(): void {
    const challenge = this.challenge();
    const code = this.digits().join('');
    if (!challenge || code.length !== 6) return;
    this.state.set('verifying');
    this.error.set('');
    this.api.verifyCode(challenge.challengeId, code)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
        if (this.state() === 'verifying') this.state.set('code');
      }))
      .subscribe({
        next: response => this.handleResult(response.data),
        error: error => this.handleCodeError(error),
      });
  }

  protected resend(): void {
    const challenge = this.challenge();
    if (!challenge || this.resendSeconds() > 0) return;
    this.api.resendCode(challenge.challengeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => this.openChallenge(response.data),
        error: error => this.handleCodeError(error),
      });
  }

  protected selectRestaurant(customerKey: string): void {
    const selectionToken = this.result()?.selectionToken;
    if (!selectionToken || this.selectingKey()) return;
    this.selectingKey.set(customerKey);
    this.api.selectRestaurant(selectionToken, customerKey)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.selectingKey.set(null)))
      .subscribe({
        next: response => this.handleResult(response.data),
        error: () => this.error.set('This selection expired. Please sign in again.'),
      });
  }

  protected changeEmail(): void {
    this.challenge.set(null);
    this.digits.set(Array<string>(6).fill(''));
    this.error.set('');
    this.state.set('email');
  }

  private restoreSession(): void {
    this.portalApi.getPortal().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => void this.router.navigateByUrl('/rewards'),
      error: error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.portalApi.clearAccessToken();
        }
        this.state.set('email');
        if (this.route.snapshot?.queryParamMap?.get('focus') === 'email') {
          setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('#rewards-email')?.focus());
        }
      },
    });
  }

  private openChallenge(challenge: CustomerLoginChallengeDto): void {
    this.challenge.set(challenge);
    this.digits.set(Array<string>(6).fill(''));
    this.state.set('code');
    this.startTimer(challenge.resendAvailableAt);
    setTimeout(() => this.focus(0));
  }

  private handleResult(result: CustomerLoginResultDto): void {
    this.result.set(result);
    if (result.status === 'Authenticated' && result.customerPortalToken) {
      if (this.state() !== 'restaurants') {
        this.portalApi.setMultipleMemberships(false);
      }
      this.portalApi.storeAccessToken(result.customerPortalToken);
      void this.router.navigateByUrl('/rewards');
    } else if (result.status === 'SelectRestaurant') {
      this.portalApi.setMultipleMemberships(result.restaurants.length > 1);
      this.state.set('restaurants');
    } else {
      this.state.set('empty');
    }
  }

  private handleCodeError(error: unknown): void {
    this.state.set('code');
    const code = error instanceof HttpErrorResponse ? error.error?.code : '';
    this.error.set(code === 'code_expired'
      ? 'This code has expired. Request a new code to continue.'
      : code === 'too_many_attempts'
        ? 'Too many incorrect attempts. Please start again.'
        : error instanceof HttpErrorResponse && error.error?.detail
          ? error.error.detail
          : 'We could not verify that code. Please try again.');
  }

  private applyCode(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 6).split('');
    this.digits.set(Array.from({ length: 6 }, (_, index) => digits[index] ?? ''));
    this.focus(Math.min(digits.length, 5));
  }

  private focus(index: number): void {
    this.host.nativeElement.querySelectorAll<HTMLInputElement>('.login-otp')[index]?.focus();
  }

  private startTimer(value: string): void {
    if (this.timer) clearInterval(this.timer);
    const update = () => this.resendSeconds.set(Math.max(
      0, Math.ceil((Date.parse(value) - Date.now()) / 1000)));
    update();
    this.timer = setInterval(update, 1000);
  }
}
