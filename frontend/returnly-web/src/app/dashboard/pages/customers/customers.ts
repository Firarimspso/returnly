import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CustomerDto, CustomerUpsertRequest } from '../../../core/models/customer.model';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import {
  CustomerActionModalComponent,
  CustomerActionMode,
  CustomerActionResult,
} from '../../components/customer-action-modal/customer-action-modal';
import { CustomerDrawerComponent } from '../../components/customer-drawer/customer-drawer';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { Customer, CustomerStatus, Reward } from '../../models/dashboard.models';

type CustomerFilter = 'All' | CustomerStatus;
type SortKey = 'name' | 'phone' | 'email' | 'points' | 'visits' | 'lastVisitTimestamp' | 'status';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-customers-page',
  imports: [FormsModule, PageHeaderComponent, CustomerDrawerComponent, CustomerActionModalComponent],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class CustomersPage {
  private readonly customerApi = inject(CustomerApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly customerRecords = signal<Customer[]>([]);
  private readonly rewardRecords = signal<Reward[]>([
    { id: 1, name: 'Free Specialty Coffee', description: 'Any hot or iced specialty drink', points: 500, active: true, icon: '☕', redemptions: 0, category: 'Drinks', createdAt: '', color: '#6952e8' },
    { id: 2, name: 'Complimentary Dessert', description: 'Choose any dessert from the menu', points: 750, active: true, icon: '✦', redemptions: 0, category: 'Food', createdAt: '', color: '#d06e79' },
    { id: 3, name: '20% Off Your Order', description: 'Valid on dine-in orders up to $100', points: 1000, active: true, icon: '%', redemptions: 0, category: 'Discount', createdAt: '', color: '#3b9470' },
  ]);

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
  protected readonly vipCount = computed(() => this.data.customers().filter((customer) => customer.status === 'VIP').length);
  protected readonly newCount = computed(() => this.data.customers().filter((customer) => customer.status === 'New').length);
  protected readonly selectedCustomer = computed(() =>
    this.data.customers().find((customer) => customer.id === this.selectedCustomerId()) ?? null,
  );

  constructor() {
    this.loadCustomers();
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
      this.updateLocalCustomer(customer.id, (current) => ({
        ...current,
        points: current.points + result.points,
        lifetimePoints: current.lifetimePoints + result.points,
        activity: [{
          title: `Added ${result.points.toLocaleString()} points`,
          description: result.note || 'Manual adjustment',
          date: 'Just now',
          icon: '✦',
        }, ...current.activity],
      }));
    }

    if (result.mode === 'reward') {
      const reward = this.rewardRecords().find((item) => item.id === result.rewardId);
      if (!reward || customer.points < reward.points) return;
      this.updateLocalCustomer(customer.id, (current) => ({
        ...current,
        points: current.points - reward.points,
        rewardsRedeemed: current.rewardsRedeemed + 1,
        favoriteReward: reward.name,
        activity: [{
          title: `Redeemed ${reward.name}`,
          description: `Used ${reward.points.toLocaleString()} points`,
          date: 'Just now',
          icon: '◇',
        }, ...current.activity],
      }));
    }

    this.actionMode.set(null);
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
        next: (response) => this.customerRecords.set(response.data.items.map((customer) => this.toViewCustomer(customer))),
        error: () => {
          this.customerRecords.set([]);
          this.errorMessage.set('Customers could not be loaded. Check the API connection and sign in again.');
        },
      });
  }

  private updateCustomer(customer: Customer, result: Extract<CustomerActionResult, { mode: 'edit' }>): void {
    const apiId = customer.apiId;
    if (!apiId) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.customerApi.updateCustomer(apiId, this.toUpdateRequest(result))
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

  private toUpdateRequest(result: Extract<CustomerActionResult, { mode: 'edit' }>): CustomerUpsertRequest {
    const parts = result.update.name.trim().split(/\s+/);
    return {
      firstName: parts.shift() ?? '',
      lastName: parts.join(' ') || '-',
      email: result.update.email,
      phoneNumber: result.update.phone,
      birthday: result.update.birthday || null,
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
      activity: lastVisit ? [{
        title: 'Visited your restaurant',
        description: `Visit #${customer.totalVisits}`,
        date: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(lastVisit),
        icon: '⌂',
      }] : [],
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
}
