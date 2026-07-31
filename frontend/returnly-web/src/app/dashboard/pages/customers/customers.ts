import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CustomerDto, CustomerUpsertRequest } from '../../../core/models/customer.model';
import {
  CreatePointTransactionRequest,
  PointTransactionDto,
} from '../../../core/models/point-transaction.model';
import { RewardDto } from '../../../core/models/reward.model';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import { PointTransactionApiService } from '../../../core/services/point-transaction-api.service';
import { RewardApiService } from '../../../core/services/reward-api.service';
import {
  CustomerActionModalComponent,
  CustomerActionMode,
  CustomerActionResult,
} from '../../components/customer-action-modal/customer-action-modal';
import { CustomerDrawerComponent } from '../../components/customer-drawer/customer-drawer';
import { CustomerFormModalComponent } from '../../components/customer-form-modal/customer-form-modal';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { Customer, CustomerStatus, Reward } from '../../models/dashboard.models';

type CustomerFilter = 'All' | CustomerStatus;
type SortKey = 'name' | 'phone' | 'email' | 'points' | 'visits' | 'lastVisitTimestamp' | 'status';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-customers-page',
  imports: [
    FormsModule,
    PageHeaderComponent,
    CustomerDrawerComponent,
    CustomerActionModalComponent,
    CustomerFormModalComponent,
  ],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class CustomersPage {
  private readonly customerApi = inject(CustomerApiService);
  private readonly pointTransactionApi = inject(PointTransactionApiService);
  private readonly rewardApi = inject(RewardApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly customerRecords = signal<Customer[]>([]);
  private readonly transactionRecords = signal<PointTransactionDto[]>([]);
  private readonly rewardRecords = signal<Reward[]>([]);

  protected readonly data = {
    customers: this.customerRecords.asReadonly(),
    rewards: this.rewardRecords.asReadonly(),
  };
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly status = signal<CustomerFilter>('All');
  protected readonly sortKey = signal<SortKey>('lastVisitTimestamp');
  protected readonly sortDirection = signal<SortDirection>('desc');
  protected readonly page = signal(1);
  protected readonly pageSize = 8;
  protected readonly selectedCustomerId = signal<number | null>(null);
  protected readonly actionMode = signal<CustomerActionMode | null>(null);
  protected readonly createModalOpen = signal(false);

  protected readonly statusOptions: CustomerFilter[] = ['All', 'Active', 'VIP', 'New'];
  protected readonly customers = computed(() => {
    const term = this.search().toLowerCase().trim();
    const key = this.sortKey();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return this.data.customers()
      .filter((customer) =>
        (this.status() === 'All' || customer.status === this.status()) &&
        (!term ||
          customer.name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          customer.phone.includes(term)),
      )
      .sort((first, second) => {
        const firstValue = first[key];
        const secondValue = second[key];
        return typeof firstValue === 'number' && typeof secondValue === 'number'
          ? (firstValue - secondValue) * direction
          : String(firstValue).localeCompare(String(secondValue)) * direction;
      });
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.customers().length / this.pageSize)));
  protected readonly visiblePages = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly pagedCustomers = computed(() =>
    this.customers().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  protected readonly firstResult = computed(() => this.customers().length ? (this.page() - 1) * this.pageSize + 1 : 0);
  protected readonly lastResult = computed(() => Math.min(this.page() * this.pageSize, this.customers().length));
  protected readonly activeCount = computed(() => this.data.customers().filter((customer) => customer.status === 'Active').length);
  protected readonly returningCount = computed(() =>
    this.data.customers().filter((customer) => customer.visits >= 2).length);
  protected readonly newCount = computed(() => this.data.customers().filter((customer) => customer.status === 'New').length);
  protected readonly selectedCustomer = computed(() =>
    this.data.customers().find((customer) => customer.id === this.selectedCustomerId()) ?? null,
  );

  constructor() {
    this.loadCustomers();
    this.loadTransactions();
    this.loadRewards();
  }

  protected updateSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  protected setStatus(value: CustomerFilter): void {
    this.status.set(value);
    this.page.set(1);
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
    this.page.set(1);
  }

  protected sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  protected goToPage(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), this.totalPages()));
  }

  protected openCustomer(customer: Customer): void {
    this.selectedCustomerId.set(customer.id);
  }

  protected openCreateCustomer(): void {
    this.createModalOpen.set(true);
  }

  protected exportCustomers(): void {
    const headers = ['Full Name', 'Phone Number', 'Email', 'Points', 'Visits', 'Last Visit', 'Status'];
    const rows = this.customers().map((customer) => [
      customer.name,
      customer.phone,
      customer.email,
      String(customer.points),
      String(customer.visits),
      customer.lastVisitTimestamp ? new Date(customer.lastVisitTimestamp).toISOString() : 'Never',
      customer.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => this.csvValue(value)).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `returnly-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  protected lastVisitBadge(customer: Customer): { label: string; tone: string } {
    if (!customer.lastVisitTimestamp) return { label: 'Never', tone: 'never' };
    const visit = new Date(customer.lastVisitTimestamp);
    const today = new Date();
    const visitDay = new Date(visit.getFullYear(), visit.getMonth(), visit.getDate()).getTime();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const days = Math.max(0, Math.round((todayDay - visitDay) / 86_400_000));
    if (days === 0) return { label: 'Today', tone: 'today' };
    if (days === 1) return { label: 'Yesterday', tone: 'yesterday' };
    return { label: `${days} days ago`, tone: days >= 30 ? 'stale' : 'recent' };
  }

  protected createCustomer(request: CustomerUpsertRequest): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.customerApi.createCustomer(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.customerRecords.update((customers) => [
            this.toViewCustomer(response.data),
            ...customers,
          ]);
          this.page.set(1);
          this.createModalOpen.set(false);
        },
        error: () => this.errorMessage.set('The customer could not be created. Please check the details and try again.'),
      });
  }

  protected openAction(action: CustomerActionMode): void {
    this.actionMode.set(action);
  }

  protected handleAction(result: CustomerActionResult): void {
    const customer = this.selectedCustomer();
    if (!customer) return;

    if (result.mode === 'edit' && customer.apiId) {
      this.updateCustomer(customer, result);
      return;
    }

    if (result.mode === 'points') {
      this.earnPoints(customer, result);
      return;
    }

    if (result.mode === 'reward') {
      const reward = this.rewardRecords().find((item) => item.id === result.rewardId);
      if (!reward || customer.points < reward.points) return;
      this.redeemReward(customer, reward);
      return;
    }
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('All');
    this.page.set(1);
    if (this.errorMessage()) this.loadCustomers();
  }

  private loadCustomers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.customerApi.getCustomers({ page: 1, pageSize: 100 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.customerRecords.set(
            response.data.items.map((customer) => this.toViewCustomer(customer)),
          );
        },
        error: () => {
          this.customerRecords.set([]);
          this.errorMessage.set('Customers could not be loaded. Check the API connection and sign in again.');
        },
      });
  }

  private loadTransactions(): void {
    this.pointTransactionApi.getTransactions({ page: 1, pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.transactionRecords.set(response.data.items);
          this.applyTransactionActivity();
        },
        error: () => this.errorMessage.set('Point activity could not be loaded. Please try again.'),
      });
  }

  private loadRewards(): void {
    this.rewardApi.getRewards({ page: 1, pageSize: 100, isActive: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.rewardRecords.set(
            response.data.items
              .filter((reward) => reward.isActive)
              .map((reward) => this.toViewReward(reward)),
          );
        },
        error: () => this.errorMessage.set('Rewards could not be loaded. Please try again.'),
      });
  }

  private earnPoints(
    customer: Customer,
    result: Extract<CustomerActionResult, { mode: 'points' }>,
  ): void {
    if (!customer.apiId) return;

    const request: CreatePointTransactionRequest = {
      customerId: customer.apiId,
      points: result.points,
      reason: result.note.trim() || 'Manual adjustment',
    };
    this.loading.set(true);
    this.errorMessage.set(null);
    this.pointTransactionApi.earnPoints(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.prependTransaction(response.data);
          this.updateLocalCustomer(customer.id, (current) => ({
            ...current,
            points: response.data.balanceAfter,
            lifetimePoints: current.lifetimePoints + response.data.points,
            activity: [this.toTimelineItem(response.data), ...current.activity],
          }));
          this.actionMode.set(null);
        },
        error: () => this.errorMessage.set('Points could not be added. Please try again.'),
      });
  }

  private redeemReward(customer: Customer, reward: Reward): void {
    if (!customer.apiId) return;

    const request: CreatePointTransactionRequest = {
      customerId: customer.apiId,
      points: reward.points,
      reason: `Redeemed ${reward.name}`,
    };
    this.loading.set(true);
    this.errorMessage.set(null);
    this.pointTransactionApi.redeemPoints(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.prependTransaction(response.data);
          this.updateLocalCustomer(customer.id, (current) => ({
            ...current,
            points: response.data.balanceAfter,
            rewardsRedeemed: current.rewardsRedeemed + 1,
            favoriteReward: reward.name,
            activity: [this.toTimelineItem(response.data), ...current.activity],
          }));
          this.actionMode.set(null);
        },
        error: () => this.errorMessage.set('The reward could not be redeemed. Please try again.'),
      });
  }

  private updateCustomer(customer: Customer, result: Extract<CustomerActionResult, { mode: 'edit' }>): void {
    const apiId = customer.apiId;
    if (!apiId) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.customerApi.updateCustomer(apiId, this.toUpdateRequest(customer, result))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const updated = this.toViewCustomer(response.data);
          this.customerRecords.update((customers) =>
            customers.map((item) => item.apiId === apiId ? { ...updated, activity: item.activity } : item),
          );
          this.actionMode.set(null);
        },
        error: () => this.errorMessage.set('The customer could not be updated. Please try again.'),
      });
  }

  private toUpdateRequest(
    customer: Customer,
    result: Extract<CustomerActionResult, { mode: 'edit' }>,
  ): CustomerUpsertRequest {
    const parts = result.update.name.trim().split(/\s+/);
    return {
      firstName: parts.shift() ?? '',
      lastName: parts.join(' ') || '-',
      email: result.update.email,
      phoneNumber: result.update.phone,
      birthday: customer.birthday === 'Not provided' ? null : customer.birthday,
      status: result.update.status === 'VIP' ? 'Vip' : result.update.status,
    };
  }

  private toViewCustomer(customer: CustomerDto): Customer {
    const lastVisit = customer.lastVisitAt ? new Date(customer.lastVisitAt) : null;
    const name = customer.fullName || `${customer.firstName} ${customer.lastName}`;
    return {
      id: this.numericId(customer.id),
      apiId: customer.id,
      name,
      phone: customer.phoneNumber,
      email: customer.email,
      birthday: customer.birthday ?? 'Not provided',
      memberSince: new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(new Date(customer.createdAt)),
      points: customer.currentPoints,
      lifetimePoints: customer.lifetimePoints,
      visits: customer.totalVisits,
      lastVisit: lastVisit
        ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(lastVisit)
        : 'Never',
      lastVisitTimestamp: lastVisit?.getTime() ?? 0,
      favoriteReward: customer.favoriteReward ?? 'None yet',
      rewardsRedeemed: customer.rewardsRedeemed,
      status: customer.status === 'Vip' ? 'VIP' : customer.status === 'Inactive' ? 'Active' : customer.status,
      initials: `${customer.firstName[0] ?? ''}${customer.lastName[0] ?? ''}`.toUpperCase(),
      color: this.avatarColor(customer.id),
      activity: [
        ...this.transactionRecords()
          .filter((transaction) => transaction.customerId === customer.id)
          .map((transaction) => this.toTimelineItem(transaction)),
        ...(lastVisit ? [{
        title: 'QR Scan',
        description: `Visit #${customer.totalVisits} recorded`,
        date: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(lastVisit),
        icon: '⌗',
        type: 'qr' as const,
        }] : []),
      ],
    };
  }

  private applyTransactionActivity(): void {
    const transactions = this.transactionRecords();
    this.customerRecords.update((customers) =>
      customers.map((customer) => ({
        ...customer,
        activity: [
          ...transactions
            .filter((transaction) => transaction.customerId === customer.apiId)
            .map((transaction) => this.toTimelineItem(transaction)),
          ...customer.activity.filter((item) => item.type === 'qr'),
        ],
      })),
    );
  }

  private prependTransaction(transaction: PointTransactionDto): void {
    this.transactionRecords.update((transactions) => [transaction, ...transactions]);
  }

  private toViewReward(reward: RewardDto): Reward {
    return {
      id: this.numericId(reward.id),
      apiId: reward.id,
      name: reward.name,
      description: reward.description,
      points: reward.requiredPoints,
      active: reward.isActive,
      icon: reward.icon || '◇',
      redemptions: reward.totalRedemptions,
      category: reward.category,
      createdAt: reward.createdAt,
      color: reward.color || '#6952e8',
    };
  }

  private toTimelineItem(transaction: PointTransactionDto) {
    const isRedeem = transaction.type === 'Redeem';
    const isQr = !isRedeem && transaction.reason.toLowerCase().startsWith('qr scan');
    const isAdjustment = !isRedeem && /manual|adjustment/i.test(transaction.reason);
    return {
      title: isRedeem
        ? 'Redeemed Reward'
        : isQr
          ? 'QR Scan'
          : isAdjustment
            ? 'Manual Adjustment'
            : 'Earned Points',
      description: isRedeem
        ? `${transaction.reason} · ${transaction.points.toLocaleString()} points`
        : `${transaction.reason} · +${transaction.points.toLocaleString()} points`,
      date: new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(transaction.createdAt)),
      icon: isRedeem ? '◇' : isQr ? '⌗' : isAdjustment ? '±' : '✦',
      type: isRedeem ? 'redeem' as const : isQr ? 'qr' as const : isAdjustment ? 'adjustment' as const : 'earn' as const,
    };
  }

  private updateLocalCustomer(id: number, updater: (customer: Customer) => Customer): void {
    this.customerRecords.update((customers) =>
      customers.map((customer) => customer.id === id ? updater(customer) : customer),
    );
  }

  private numericId(id: string): number {
    return [...id].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) | 0, 7) >>> 0;
  }

  private avatarColor(id: string): string {
    const colors = ['#7857d9', '#d56f66', '#3f9d7c', '#c48736', '#487abf', '#995fa7'];
    return colors[this.numericId(id) % colors.length];
  }

  private csvValue(value: string): string {
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  }
}
