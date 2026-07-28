import { Component, effect, inject, input, signal } from '@angular/core';
import QRCode from 'qrcode';
import { SCAN_BASE_URL } from '../../../core/config/scan-url.config';

@Component({
  selector: 'app-qr-image',
  template: `<img [src]="imageUrl()" [alt]="alt()" />`,
  styles: [`
    :host{display:block;line-height:0}
    img{display:block;width:100%;height:100%;object-fit:contain}
  `],
})
export class QrImageComponent {
  private readonly scanBaseUrl = inject(SCAN_BASE_URL);
  readonly token = input.required<string>();
  readonly alt = input('QR code');
  protected readonly imageUrl = signal('');

  constructor() {
    effect(() => {
      void this.render(this.token());
    });
  }

  private async render(token: string): Promise<void> {
    this.imageUrl.set(await QRCode.toDataURL(this.scanUrl(token), {
      width: 512,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: { dark: '#211d29', light: '#ffffff' },
    }));
  }

  private scanUrl(token: string): string {
    return `${this.scanBaseUrl.replace(/\/+$/, '')}/scan/${encodeURIComponent(token)}`;
  }
}
