import { Component, effect, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QrCode, QrCodeDraft, QrCodeStatus, QrCodeType } from '../../models/dashboard.models';

@Component({
  selector: 'app-qr-form-modal',
  imports: [FormsModule],
  templateUrl: './qr-form-modal.html',
  styleUrl: './qr-form-modal.scss',
})
export class QrFormModalComponent {
  readonly qrCode = input<QrCode | null>(null);
  readonly closed = output<void>();
  readonly saved = output<QrCodeDraft>();
  protected readonly name = signal('');
  protected readonly type = signal<QrCodeType>('General');
  protected readonly status = signal<QrCodeStatus>('Active');
  protected readonly pointsPerScan = signal<number | null>(5);
  protected readonly error = signal('');
  protected readonly types: { value: QrCodeType; icon: string; description: string }[] = [
    { value: 'General', icon: '⌗', description: 'Menus, windows, and general use' },
    { value: 'Table', icon: '▦', description: 'Track scans from a specific table' },
    { value: 'Receipt', icon: '▤', description: 'Printed receipts and takeaway bags' },
  ];

  constructor() {
    effect(() => {
      const qr = this.qrCode();
      if (!qr) return;
      this.name.set(qr.name);
      this.type.set(qr.type);
      this.status.set(qr.status);
      this.pointsPerScan.set(qr.pointsPerScan);
    });
  }

  protected submit(): void {
    if (!this.name().trim()) { this.error.set('Enter a name for this QR code.'); return; }
    const points = Math.round(Number(this.pointsPerScan()));
    if (!Number.isFinite(points) || points < 1 || points > 10000) {
      this.error.set('Points per scan must be between 1 and 10,000.');
      return;
    }
    this.saved.emit({
      name: this.name().trim(),
      type: this.type(),
      status: this.status(),
      pointsPerScan: points,
    });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void { this.closed.emit(); }
}
