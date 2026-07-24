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

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    if (this.escapeEnabled()) this.closed.emit();
  }
}
