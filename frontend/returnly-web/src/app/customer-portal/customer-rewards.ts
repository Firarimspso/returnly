import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import {
  CustomerPortalDto,
  CustomerPortalRewardDto,
  RedemptionRequestDto,
} from '../core/models/customer-portal.model';
import { CustomerPortalApiService } from '../core/services/customer-portal-api.service';
import { RewardVisualIconComponent } from '../dashboard/components/reward-visual-icon/reward-visual-icon';

@Component({
  selector: 'app-customer-rewards-page',
  imports: [RewardVisualIconComponent, RouterLink],
  templateUrl: './customer-rewards.html',
})
export class CustomerRewardsPage {
  private readonly portalApi = inject(CustomerPortalApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly portal = signal<CustomerPortalDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly requestingRewardId = signal<string | null>(null);
  protected readonly redemptionRequest = signal<RedemptionRequestDto | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly displayedBalance = signal(0);
  protected readonly redemptionSecondsRemaining = signal(0);
  protected readonly accountMenuOpen = signal(false);
  protected readonly signingOut = signal(false);
  protected readonly hasMultipleMemberships = this.portalApi.hasMultipleMemberships;
  private countdownTimer?: ReturnType<typeof setInterval>;
  private balanceFrame?: number;
  protected readonly restaurantInitials = computed(() => {
    const name = this.portal()?.restaurantName || 'Returnly';
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0]).join('').toUpperCase();
  });
  protected readonly unlockedRewards = computed(() =>
    this.portal()?.rewards.filter((reward) => reward.isUnlocked) ?? []);
  protected readonly lockedRewards = computed(() =>
    this.portal()?.rewards.filter((reward) => !reward.isUnlocked) ?? []);
  protected readonly redemptionCountdown = computed(() => {
    const seconds = this.redemptionSecondsRemaining();
    if (seconds <= 0) return 'Code expired';
    const minutes = Math.floor(seconds / 60);
    const remainder = String(seconds % 60).padStart(2, '0');
    return `${minutes}:${remainder} remaining`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      if (this.balanceFrame) globalThis.cancelAnimationFrame?.(this.balanceFrame);
    });
    this.loadPortal();
  }

  protected requestReward(reward: CustomerPortalRewardDto): void {
    if (!reward.isUnlocked || this.requestingRewardId()) return;
    this.requestingRewardId.set(reward.id);
    this.errorMessage.set('');
    this.portalApi.requestRedemption(reward.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.requestingRewardId.set(null)),
      )
      .subscribe({
        next: (response) => {
          this.redemptionRequest.set(response.data);
          this.startCountdown(response.data.expiresAt);
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Your balance changed and this reward is no longer available.'
              : 'We could not create the redemption code. Please try again.',
          );
        },
      });
  }

  protected closeRedemption(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.redemptionRequest.set(null);
    this.loadPortal();
  }

  protected toggleAccountMenu(): void {
    this.accountMenuOpen.update((open) => !open);
  }

  protected goToSection(sectionId: string): void {
    this.accountMenuOpen.set(false);
    globalThis.document?.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  protected endCustomerSession(focusEmail = false): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.errorMessage.set('');
    this.portalApi.logout()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.signingOut.set(false)),
      )
      .subscribe({
        next: () => {
          this.portalApi.clearCustomerSession();
          void this.router.navigate(['/my-rewards'], {
            queryParams: focusEmail ? { focus: 'email' } : undefined,
          });
        },
        error: () => this.errorMessage.set(
          'We could not end your session right now. Please try again.',
        ),
      });
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected statusLabel(status: string): string {
    if (status === 'Confirmed') return 'Redeemed';
    if (status === 'Pending') return 'Waiting for staff';
    if (status === 'Cancelled') return 'Not completed';
    return status;
  }

  protected transactionLabel(type: string, reason: string): string {
    const normalized = reason.toLowerCase();
    if (normalized.includes('scan') || normalized.includes('visit')) return 'Points from your visit';
    if (normalized.includes('manual') || normalized.includes('adjust')) {
      return type === 'Earn' ? 'Points added by the restaurant' : 'Balance updated by the restaurant';
    }
    if (type === 'Redeem') return 'Reward redeemed';
    return reason || 'Loyalty points earned';
  }

  private loadPortal(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.portalApi.getPortal()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.portal.set(response.data);
          this.animateBalance(response.data.currentPoints);
        },
        error: () => {
          this.portal.set(null);
          this.errorMessage.set(
            'Your rewards session has expired. Scan a restaurant QR code to open your rewards again.',
          );
        },
      });
  }

  private startCountdown(expiresAt: string): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    const update = (): void => {
      this.redemptionSecondsRemaining.set(Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      ));
    };
    update();
    this.countdownTimer = setInterval(update, 1000);
  }

  private animateBalance(target: number): void {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || !globalThis.requestAnimationFrame) {
      this.displayedBalance.set(target);
      return;
    }
    const startedAt = globalThis.performance.now();
    const update = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / 700);
      this.displayedBalance.set(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) this.balanceFrame = globalThis.requestAnimationFrame(update);
    };
    this.balanceFrame = globalThis.requestAnimationFrame(update);
  }
}
