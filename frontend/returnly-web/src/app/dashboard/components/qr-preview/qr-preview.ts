import { Component, computed, inject, input, output } from '@angular/core';
import { RestaurantProfileApiService } from '../../../core/services/restaurant-profile-api.service';
import { QrCode } from '../../models/dashboard.models';
import { QrImageComponent } from '../qr-image/qr-image';
import { QrTypeIconComponent } from '../qr-type-icon/qr-type-icon';

@Component({
  selector: 'app-qr-preview',
  imports: [QrImageComponent, QrTypeIconComponent],
  templateUrl: './qr-preview.html',
  styleUrls: ['./qr-preview.scss', './qr-preview-polish.scss'],
})
export class QrPreviewComponent {
  private readonly profileApi = inject(RestaurantProfileApiService);

  readonly qrCode = input.required<QrCode>();
  readonly download = output<void>();
  readonly print = output<void>();
  protected readonly restaurantName = computed(() =>
    this.profileApi.profile()?.name?.trim() || 'Your restaurant');
  protected readonly restaurantLogo = computed(() => this.profileApi.profile()?.logoUrl);
  protected readonly brandColor = computed(() =>
    this.profileApi.profile()?.primaryBrandColor || '#6952e8');
  protected readonly restaurantInitials = computed(() =>
    this.restaurantName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'R');
}
