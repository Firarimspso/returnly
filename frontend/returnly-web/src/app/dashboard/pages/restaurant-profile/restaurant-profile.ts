import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BusinessDay, UpdateRestaurantProfileRequest } from '../../../core/models/restaurant-profile.model';
import { RestaurantProfileApiService } from '../../../core/services/restaurant-profile-api.service';
import {
  LEBANON_PHONE_CONFIG,
  formatNationalPhone,
  validateCountryPhone,
} from '../../../core/validation/country-phone';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { TimePickerComponent } from '../../components/time-picker/time-picker';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DEFAULT_BRAND_COLOR = '#6952E8';

@Component({
  selector: 'app-restaurant-profile-page',
  imports: [FormsModule, PageHeaderComponent, TimePickerComponent],
  templateUrl: './restaurant-profile.html',
  styleUrls: [
    './restaurant-profile.scss',
    './restaurant-phone.scss',
    './restaurant-profile-preview.scss',
  ],
})
export class RestaurantProfilePage {
  private readonly api = inject(RestaurantProfileApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly days = DAYS;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly form = signal<UpdateRestaurantProfileRequest>(this.emptyForm());
  protected readonly hours = signal<Record<string, BusinessDay>>(this.defaultHours());
  protected readonly phoneNational = signal('');
  protected readonly phoneTouched = signal(false);
  protected readonly phoneError = signal<string | null>(null);
  protected readonly businessHoursErrors = computed<Record<string, string>>(() => {
    const errors: Record<string, string> = {};
    for (const day of DAYS) {
      const hours = this.hours()[day];
      if (hours.closed) continue;
      if (!this.validTime(hours.open) || !this.validTime(hours.close)) {
        errors[day] = 'Choose both an opening and closing time.';
      } else if (hours.open >= hours.close) {
        errors[day] = 'Opening time must be before closing time.';
      }
    }
    return errors;
  });
  protected readonly hasBusinessHoursErrors = computed(() =>
    Object.keys(this.businessHoursErrors()).length > 0);

  constructor() { this.load(); }

  protected patch<K extends keyof UpdateRestaurantProfileRequest>(
    key: K, value: UpdateRestaurantProfileRequest[K],
  ): void {
    this.form.update((form) => ({ ...form, [key]: value }));
    this.successMessage.set('');
    this.saved.set(false);
  }

  protected updateHours(day: string, key: keyof BusinessDay, value: string | boolean): void {
    this.hours.update((hours) => ({ ...hours, [day]: { ...hours[day], [key]: value } }));
    this.errorMessage.set('');
    this.successMessage.set('');
    this.saved.set(false);
  }

  protected updatePhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatNationalPhone(input.value);
    input.value = formatted;
    this.phoneNational.set(formatted);
    this.phoneTouched.set(true);
    this.phoneError.set(validateCountryPhone(formatted, LEBANON_PHONE_CONFIG).error);
    this.successMessage.set('');
    this.saved.set(false);
  }

  protected validatePhone(): void {
    this.phoneTouched.set(true);
    this.phoneError.set(
      validateCountryPhone(this.phoneNational(), LEBANON_PHONE_CONFIG).error,
    );
  }

  protected upload(event: Event, field: 'logoUrl' | 'coverImageUrl'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2_000_000) {
      this.errorMessage.set('Choose a JPG, PNG, WebP or SVG image smaller than 2 MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.patch(field, String(reader.result));
    reader.onerror = () => this.errorMessage.set('The selected image could not be read.');
    reader.readAsDataURL(file);
  }

  protected copyMondayToWeekdays(): void {
    const monday = this.hours()['Monday'];
    this.hours.update((hours) => ({
      ...hours,
      Tuesday: { ...monday },
      Wednesday: { ...monday },
      Thursday: { ...monday },
      Friday: { ...monday },
    }));
    this.errorMessage.set('');
    this.successMessage.set('');
    this.saved.set(false);
  }

  protected resetBrandColor(): void {
    this.patch('primaryBrandColor', DEFAULT_BRAND_COLOR);
  }

  protected save(): void {
    const form = this.form();
    const phone = validateCountryPhone(this.phoneNational(), LEBANON_PHONE_CONFIG);
    this.phoneTouched.set(true);
    this.phoneError.set(phone.error);
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      || !/^#[0-9a-f]{6}$/i.test(form.primaryBrandColor)
      || phone.error
      || this.hasBusinessHoursErrors()) {
      this.errorMessage.set('Complete the required fields and correct the highlighted values.');
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.api.updateProfile({
      ...form,
      name: form.name.trim(),
      phone: phone.normalized,
      businessHours: JSON.stringify(this.hours()),
    })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.form.set(this.toForm(response.data));
          this.phoneNational.set(this.nationalPhone(response.data.phone));
          this.phoneTouched.set(false);
          this.phoneError.set(null);
          this.saved.set(true);
          this.successMessage.set('Restaurant profile saved. Your branding is now live.');
        },
        error: (error: HttpErrorResponse) =>
          this.errorMessage.set(error.error?.detail || 'The restaurant profile could not be saved.'),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api.getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.form.set(this.toForm(response.data));
          this.phoneNational.set(this.nationalPhone(response.data.phone));
          try { this.hours.set({ ...this.defaultHours(), ...JSON.parse(response.data.businessHours) }); }
          catch { this.hours.set(this.defaultHours()); }
        },
        error: () => this.errorMessage.set('The restaurant profile could not be loaded.'),
      });
  }

  private toForm(profile: UpdateRestaurantProfileRequest): UpdateRestaurantProfileRequest {
    return {
      name: profile.name, logoUrl: profile.logoUrl, coverImageUrl: profile.coverImageUrl,
      description: profile.description, phone: profile.phone, email: profile.email,
      website: profile.website, address: profile.address, businessHours: profile.businessHours,
      instagram: profile.instagram, facebook: profile.facebook,
      primaryBrandColor: profile.primaryBrandColor || '#6952E8',
    };
  }

  private emptyForm(): UpdateRestaurantProfileRequest {
    return { name: '', logoUrl: null, coverImageUrl: null, description: null, phone: null,
      email: '', website: null, address: null, businessHours: '{}', instagram: null,
      facebook: null, primaryBrandColor: DEFAULT_BRAND_COLOR };
  }

  private defaultHours(): Record<string, BusinessDay> {
    return Object.fromEntries(DAYS.map((day) =>
      [day, { open: '09:00', close: '22:00', closed: day === 'Sunday' }]));
  }

  private nationalPhone(value: string | null): string {
    if (!value) return '';
    return formatNationalPhone(LEBANON_PHONE_CONFIG.fromE164(value) ?? '');
  }

  private validTime(value: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }
}
