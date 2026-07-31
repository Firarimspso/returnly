import { Component, HostListener, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerUpsertRequest } from '../../../core/models/customer.model';
import { LebanesePhoneInputComponent } from '../../../shared/components/lebanese-phone-input/lebanese-phone-input';

@Component({
  selector: 'app-customer-form-modal',
  imports: [FormsModule, LebanesePhoneInputComponent],
  templateUrl: './customer-form-modal.html',
  styleUrl: './customer-form-modal.scss',
})
export class CustomerFormModalComponent {
  readonly closed = output<void>();
  readonly submitted = output<CustomerUpsertRequest>();

  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly phoneNumber = signal<string | null>(null);
  protected readonly phoneValid = signal(false);
  protected readonly email = signal('');
  protected readonly error = signal('');

  protected submit(): void {
    const firstName = this.firstName().trim();
    const lastName = this.lastName().trim();
    const phone = this.phoneNumber();
    const email = this.email().trim();

    this.error.set('');
    if (!firstName || !lastName) {
      this.error.set('Enter the customer’s first and last name.');
      return;
    }
    if (!this.phoneValid() || !phone) {
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
      phoneNumber: phone,
      email,
      birthday: null,
      status: 'Active',
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
