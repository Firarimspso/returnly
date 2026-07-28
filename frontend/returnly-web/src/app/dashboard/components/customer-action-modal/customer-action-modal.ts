import { Component, computed, effect, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { validateLebaneseMobile } from '../../../core/validation/lebanese-mobile';
import { Customer, CustomerStatus, CustomerUpdate, Reward } from '../../models/dashboard.models';

export type CustomerActionMode = 'points' | 'reward' | 'edit';

export type CustomerActionResult =
  | { mode: 'points'; points: number; note: string }
  | { mode: 'reward'; rewardId: number }
  | { mode: 'edit'; update: CustomerUpdate };

@Component({
  selector: 'app-customer-action-modal',
  imports: [FormsModule],
  templateUrl: './customer-action-modal.html',
  styleUrl: './customer-action-modal.scss',
})
export class CustomerActionModalComponent {
  readonly mode = input.required<CustomerActionMode>();
  readonly customer = input.required<Customer>();
  readonly rewards = input<Reward[]>([]);
  readonly closed = output<void>();
  readonly submitted = output<CustomerActionResult>();

  protected readonly points = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly selectedRewardId = signal<number | null>(null);
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly status = signal<CustomerStatus>('Active');
  protected readonly error = signal('');
  protected readonly statusOptions: CustomerStatus[] = ['Active', 'VIP', 'New'];

  protected readonly selectedReward = computed(() =>
    this.rewards().find((reward) => reward.id === this.selectedRewardId()),
  );
  protected readonly eligibleRewards = computed(() => this.rewards().filter((reward) => reward.active));
  protected readonly insufficientPoints = computed(() => {
    const reward = this.selectedReward();
    return reward ? this.customer().points < reward.points : false;
  });
  protected readonly phoneInvalid = computed(
    () => validateLebaneseMobile(this.phone()).normalized === null,
  );
  protected readonly showPhoneError = computed(
    () => this.mode() === 'edit' && this.phone().trim().length > 0 && this.phoneInvalid(),
  );

  constructor() {
    effect(() => {
      const customer = this.customer();
      this.name.set(customer.name);
      this.phone.set(customer.phone);
      this.email.set(customer.email);
      this.status.set(customer.status);
    });
    effect(() => {
      const rewards = this.eligibleRewards();
      this.selectedRewardId.set(rewards[0]?.id ?? null);
    });
  }

  protected get title(): string {
    return { points: 'Add customer points', reward: 'Redeem a reward', edit: 'Edit customer' }[this.mode()];
  }

  protected get description(): string {
    return {
      points: `Add loyalty points to ${this.customer().name}'s balance.`,
      reward: `Choose a reward for ${this.customer().name} to redeem.`,
      edit: `Update ${this.customer().name}'s profile information.`,
    }[this.mode()];
  }

  protected submit(): void {
    this.error.set('');

    if (this.mode() === 'points') {
      const points = Math.round(Number(this.points()));
      if (!Number.isFinite(points) || points < 1 || points > 10000) {
        this.error.set('Enter a point amount between 1 and 10,000.');
        return;
      }
      this.submitted.emit({ mode: 'points', points, note: this.note() });
      return;
    }

    if (this.mode() === 'reward') {
      const rewardId = this.selectedRewardId();
      if (rewardId === null || this.insufficientPoints()) {
        this.error.set('This customer does not have enough points for that reward.');
        return;
      }
      this.submitted.emit({ mode: 'reward', rewardId });
      return;
    }

    const phone = validateLebaneseMobile(this.phone());
    if (!this.name().trim() || !this.email().includes('@')) {
      this.error.set('Enter the customer’s name and a valid email address.');
      return;
    }
    if (phone.error || !phone.normalized) {
      this.error.set('Please enter a valid Lebanese mobile number.');
      return;
    }
    this.submitted.emit({
      mode: 'edit',
      update: {
        name: this.name().trim(),
        phone: phone.normalized,
        email: this.email().trim(),
        status: this.status(),
      },
    });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.closed.emit();
  }
}
