import { Component, effect, input, output, signal } from '@angular/core';
import {
  LEBANON_PHONE_CONFIG,
  formatNationalPhone,
  validateCountryPhone,
} from '../../../core/validation/country-phone';

@Component({
  selector: 'app-lebanese-phone-input',
  templateUrl: './lebanese-phone-input.html',
  styleUrl: './lebanese-phone-input.scss',
})
export class LebanesePhoneInputComponent {
  readonly value = input<string | null>('');
  readonly required = input(false);
  readonly autocomplete = input('tel');
  readonly valueChange = output<string | null>();
  readonly validChange = output<boolean>();

  protected readonly national = signal('');
  protected readonly touched = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const value = this.value() ?? '';
      const digits = LEBANON_PHONE_CONFIG.fromE164(value) ?? value;
      this.national.set(formatNationalPhone(digits));
      this.validate(false);
    });
  }

  protected update(value: string): void {
    this.national.set(formatNationalPhone(value));
    this.touched.set(true);
    this.validate(true);
  }

  protected markTouched(): void {
    this.touched.set(true);
    this.validate(false);
  }

  private validate(emitValue: boolean): void {
    const result = validateCountryPhone(
      this.national(),
      LEBANON_PHONE_CONFIG,
      this.required(),
    );
    this.error.set(result.error);
    this.validChange.emit(result.error === null);
    if (emitValue && (result.normalized || !this.national().trim())) {
      this.valueChange.emit(result.normalized);
    }
  }
}
