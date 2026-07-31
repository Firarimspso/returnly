import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AdminRedemptionRequestDto,
  ConfirmedRedemptionDto,
  RedemptionRequestStatus,
} from '../../../core/models/redemption-request.model';
import { RedemptionRequestApiService } from '../../../core/services/redemption-request-api.service';
import { PageHeaderComponent } from '../../components/page-header/page-header';

type StatusFilter = 'All' | 'Pending' | 'Confirmed' | 'Expired' | 'Rejected';

const statusPriority: Record<RedemptionRequestStatus, number> = {
  Pending: 0,
  Confirmed: 1,
  Expired: 2,
  Cancelled: 3,
};

export function sortRedemptionRequests(
  requests: AdminRedemptionRequestDto[],
): AdminRedemptionRequestDto[] {
  return requests
    .map((request, index) => ({ request, index }))
    .sort((first, second) =>
      statusPriority[first.request.status] - statusPriority[second.request.status]
      || first.index - second.index)
    .map(({ request }) => request);
}

export function redemptionExpiryLabel(
  request: AdminRedemptionRequestDto,
  now: number,
): string | null {
  if (request.status !== 'Pending' && request.status !== 'Expired') return null;

  const difference = new Date(request.expiresAt).getTime() - now;
  const absolute = Math.abs(difference);
  const isFuture = difference > 0;
  let value: number;
  let unit: string;

  if (absolute < 60 * 60 * 1000) {
    value = Math.max(1, Math.ceil(absolute / (60 * 1000)));
    unit = value === 1 ? 'min' : 'min';
  } else if (absolute < 24 * 60 * 60 * 1000) {
    value = Math.max(1, Math.round(absolute / (60 * 60 * 1000)));
    unit = value === 1 ? 'hour' : 'hours';
  } else {
    value = Math.max(1, Math.round(absolute / (24 * 60 * 60 * 1000)));
    unit = value === 1 ? 'day' : 'days';
  }

  return isFuture ? `Expires in ${value} ${unit}` : `Expired ${value} ${unit} ago`;
}

@Component({
  selector: 'app-redemptions-page',
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './redemptions.html',
  styleUrls: ['./redemptions.scss', './redemptions-polish.scss'],
})
export class RedemptionsPage {
  private readonly api = inject(RedemptionRequestApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly requests = signal<AdminRedemptionRequestDto[]>([]);
  protected readonly sortedRequests = computed(() => sortRedemptionRequests(this.requests()));
  protected readonly loading = signal(true);
  protected readonly confirming = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly confirmationError = signal<string | null>(null);
  protected readonly confirmationResult = signal<ConfirmedRedemptionDto | null>(null);
  protected readonly search = signal('');
  protected readonly status = signal<StatusFilter>('All');
  protected readonly page = signal(1);
  protected readonly pageSize = 20;
  protected readonly totalCount = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly confirmationCode = signal('');
  protected readonly selectedRequestId = signal<string | null>(null);
  protected readonly copiedCode = signal<string | null>(null);
  protected readonly now = signal(Date.now());
  protected readonly statusOptions: StatusFilter[] =
    ['All', 'Pending', 'Confirmed', 'Expired', 'Rejected'];
  protected readonly canConfirm = computed(() =>
    /^[A-Z0-9]{8}$/.test(this.confirmationCode().trim().toUpperCase()) && !this.confirming());

  constructor() {
    const clock = globalThis.setInterval(() => this.now.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => globalThis.clearInterval(clock));
    this.loadRequests();
  }

  protected applySearch(): void {
    this.page.set(1);
    this.loadRequests();
  }

  protected selectStatus(status: StatusFilter): void {
    this.status.set(status);
    this.page.set(1);
    this.loadRequests();
  }

  protected selectRequest(request: AdminRedemptionRequestDto): void {
    if (request.status !== 'Pending') return;
    this.selectedRequestId.set(request.id);
    this.confirmationCode.set(request.confirmationCode);
    this.confirmationError.set(null);
    this.confirmationResult.set(null);
  }

  protected updateCode(value: string): void {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    this.confirmationCode.set(normalized);
    this.selectedRequestId.set(
      this.requests().find((request) =>
        request.status === 'Pending' && request.confirmationCode === normalized)?.id ?? null,
    );
    this.confirmationError.set(null);
    this.confirmationResult.set(null);
  }

  protected confirm(): void {
    if (!this.canConfirm()) {
      this.confirmationError.set('Enter the complete 8-character confirmation code.');
      return;
    }

    this.confirming.set(true);
    this.confirmationError.set(null);
    this.confirmationResult.set(null);
    this.api.confirm(this.confirmationCode())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.confirming.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.confirmationResult.set(response.data);
          this.confirmationCode.set('');
          this.selectedRequestId.set(null);
          // The confirmation endpoint updates the balance, reward totals and loyalty
          // history atomically. Reloading from the API prevents stale admin data.
          this.loadRequests(false);
        },
        error: (error: HttpErrorResponse) => {
          this.confirmationError.set(this.confirmationErrorFor(error));
          this.loadRequests(false);
        },
      });
  }

  protected previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.loadRequests();
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.loadRequests();
  }

  protected retry(): void {
    this.loadRequests();
  }

  protected displayStatus(status: RedemptionRequestStatus): string {
    return status === 'Cancelled' ? 'Rejected' : status;
  }

  protected expirationLabel(request: AdminRedemptionRequestDto): string | null {
    return redemptionExpiryLabel(request, this.now());
  }

  protected async copyCode(code: string): Promise<void> {
    try {
      if (!globalThis.navigator?.clipboard) throw new Error('Clipboard API unavailable');
      await globalThis.navigator.clipboard.writeText(code);
      this.showCopiedState(code);
    } catch {
      const input = globalThis.document?.createElement('textarea');
      if (!input) return;
      input.value = code;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      globalThis.document.body.appendChild(input);
      input.select();
      const copied = globalThis.document.execCommand('copy');
      input.remove();
      if (copied) this.showCopiedState(code);
    }
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0]).join('').toUpperCase();
  }

  private showCopiedState(code: string): void {
    this.copiedCode.set(code);
    globalThis.setTimeout(() => {
      if (this.copiedCode() === code) this.copiedCode.set(null);
    }, 1_800);
  }

  private loadRequests(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.errorMessage.set(null);
    this.api.getRequests({
      page: this.page(),
      pageSize: this.pageSize,
      search: this.search(),
      status: this.apiStatus(this.status()),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.requests.set(response.data.items);
          this.totalCount.set(response.data.totalCount);
          this.totalPages.set(response.data.totalPages);
        },
        error: () => {
          this.requests.set([]);
          this.totalCount.set(0);
          this.totalPages.set(0);
          this.errorMessage.set(
            'Redemption requests could not be loaded. Check the API connection and try again.',
          );
        },
      });
  }

  private apiStatus(status: StatusFilter): RedemptionRequestStatus | undefined {
    if (status === 'All') return undefined;
    return status === 'Rejected' ? 'Cancelled' : status;
  }

  private confirmationErrorFor(error: HttpErrorResponse): string {
    if (error.status === 404) return 'No redemption request matches that code.';
    if (error.status === 409) {
      return error.error?.title === 'Not enough points'
        ? 'The customer no longer has enough points for this reward.'
        : 'This redemption request has already been processed.';
    }
    if (error.status === 410) return 'This code has expired. Ask the customer to request another.';
    return 'The redemption could not be confirmed. Please try again.';
  }
}
