import { Component, computed, HostListener, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiCustomerStatus, CustomerUpsertRequest } from '../../../core/models/customer.model';
import { validateLebaneseMobile } from '../../../core/validation/lebanese-mobile';

@Component({
  selector: 'app-customer-form-modal',
  imports: [FormsModule],
  templateUrl: './customer-form-modal.html',
  styleUrl: './customer-form-modal.scss',
})
export class CustomerFormModalComponent {
  readonly closed = output<void>();
  readonly submitted = output<CustomerUpsertRequest>();

  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly phoneNumber = signal('');
  protected readonly email = signal('');
  protected readonly status = signal<ApiCustomerStatus>('Active');
  protected readonly error = signal('');
  protected readonly statusOptions: Array<{ value: ApiCustomerStatus; label: string }> = [
    { value: 'Active', label: 'Active' },
    { value: 'Vip', label: 'VIP' },
    { value: 'New', label: 'New' },
  ];
  protected readonly phoneInvalid = computed(
    () => validateLebaneseMobile(this.phoneNumber()).normalized === null,
  );
  protected readonly showPhoneError = computed(
    () => this.phoneNumber().trim().length > 0 && this.phoneInvalid(),
  );

  protected submit(): void {
    const firstName = this.firstName().trim();
    const lastName = this.lastName().trim();
    const phone = validateLebaneseMobile(this.phoneNumber());
    const email = this.email().trim();

    this.error.set('');
    if (!firstName || !lastName) {
      this.error.set('Enter the customer’s first and last name.');
      return;
    }
    if (phone.error || !phone.normalized) {
      this.error.set('Please enter a valid Lebanese mobile number.');
      return;
    }
    if (!this.isValidEmail(email)) {
      this.error.set('Enter a valid email address.');
      return;
    }

    this.submitted.emit({
      firstName,
      lastName,
      phoneNumber: phone.normalized,
      email,
      birthday: null,
      status: this.status(),
    });
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.closed.emit();
  }
}
