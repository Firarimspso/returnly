import { Component, input, output } from '@angular/core';
import { QrCode } from '../../models/dashboard.models';
import { QrImageComponent } from '../qr-image/qr-image';

@Component({
  selector: 'app-qr-preview',
  imports: [QrImageComponent],
  templateUrl: './qr-preview.html',
  styleUrl: './qr-preview.scss',
})
export class QrPreviewComponent {
  readonly qrCode = input.required<QrCode>();
  readonly download = output<void>();
  readonly print = output<void>();
}
