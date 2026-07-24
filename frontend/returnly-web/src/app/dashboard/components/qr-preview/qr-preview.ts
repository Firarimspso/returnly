import { Component, computed, inject, input, output } from '@angular/core';
import { QrCode } from '../../models/dashboard.models';
import { QrCodeDataService } from '../../services/qr-code-data';

@Component({
  selector: 'app-qr-preview',
  templateUrl: './qr-preview.html',
  styleUrl: './qr-preview.scss',
})
export class QrPreviewComponent {
  private readonly qrData = inject(QrCodeDataService);
  readonly qrCode = input.required<QrCode>();
  readonly edit = output<void>();
  readonly download = output<void>();
  readonly print = output<void>();
  protected readonly cells = computed(() => this.qrData.matrix(this.qrCode().code).flat());
}
