import { Component, HostListener, input, output } from '@angular/core';
import { Customer } from '../../models/dashboard.models';

@Component({
  selector: 'app-customer-drawer',
  templateUrl: './customer-drawer.html',
  styleUrl: './customer-drawer.scss',
})
export class CustomerDrawerComponent {
  readonly customer = input.required<Customer>();
  readonly escapeEnabled = input(true);
  readonly closed = output<void>();
  readonly actionSelected = output<'points' | 'reward' | 'edit'>();

  protected membershipLevel(): 'Bronze' | 'Silver' | 'Gold' | 'VIP' {
    // TODO: Replace these presentation-only thresholds with the loyalty engine.
    const points = this.customer().lifetimePoints;
    if (points >= 3_000) return 'VIP';
    if (points >= 1_500) return 'Gold';
    if (points >= 500) return 'Silver';
    return 'Bronze';
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    if (this.escapeEnabled()) this.closed.emit();
  }
}
