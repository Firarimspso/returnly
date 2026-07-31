import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QrCodeType } from '../../models/dashboard.models';

export type QrTypeIconValue = QrCodeType | 'All types';

@Component({
  selector: 'app-qr-type-icon',
  templateUrl: './qr-type-icon.html',
  styleUrl: './qr-type-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrTypeIconComponent {
  readonly type = input.required<QrTypeIconValue>();
}
