import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CustomerActionModalComponent,
  CustomerActionMode,
  CustomerActionResult,
} from '../../components/customer-action-modal/customer-action-modal';
import { CustomerDrawerComponent } from '../../components/customer-drawer/customer-drawer';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { Customer, CustomerStatus } from '../../models/dashboard.models';
import { DashboardDataService } from '../../services/dashboard-data';

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
  protected readonly data = inject(DashboardDataService);

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
    const customerId = this.selectedCustomerId();
    if (customerId === null) return;

    switch (result.mode) {
      case 'points':
        this.data.addCustomerPoints(customerId, result.points, result.note);
        break;
      case 'reward':
        if (!this.data.redeemCustomerReward(customerId, result.rewardId)) return;
        break;
      case 'edit':
        this.data.updateCustomerProfile(customerId, result.update);
        break;
    }
    this.actionMode.set(null);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('All');
    this.page.set(1);
  }
}
