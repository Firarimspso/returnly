import { Injectable, signal } from '@angular/core';
import { QrCode, QrCodeDraft, QrCodeStatus } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class QrCodeDataService {
  readonly qrCodes = signal<QrCode[]>([
    { id: 1, name: 'Main Loyalty QR', type: 'General', status: 'Active', totalScans: 6842, scansToday: 84, conversions: 4926, lastScan: '2 min ago', destination: 'https://returnly.app/sole-maple', createdAt: 'May 12, 2026', code: 'RTLY-GN-8K2M' },
    { id: 2, name: 'Table 01', type: 'Table', status: 'Active', totalScans: 1248, scansToday: 18, conversions: 931, lastScan: '8 min ago', destination: 'https://returnly.app/sole-maple/table-01', createdAt: 'May 18, 2026', code: 'RTLY-TB-1A9F' },
    { id: 3, name: 'Table 02', type: 'Table', status: 'Active', totalScans: 1104, scansToday: 12, conversions: 824, lastScan: '21 min ago', destination: 'https://returnly.app/sole-maple/table-02', createdAt: 'May 18, 2026', code: 'RTLY-TB-2C7P' },
    { id: 4, name: 'Table 03', type: 'Table', status: 'Inactive', totalScans: 876, scansToday: 0, conversions: 602, lastScan: 'Jun 28, 4:42 PM', destination: 'https://returnly.app/sole-maple/table-03', createdAt: 'May 18, 2026', code: 'RTLY-TB-3D4Q' },
    { id: 5, name: 'POS Receipt QR', type: 'Receipt', status: 'Active', totalScans: 3290, scansToday: 46, conversions: 2401, lastScan: '5 min ago', destination: 'https://returnly.app/sole-maple/receipt', createdAt: 'Jun 4, 2026', code: 'RTLY-RC-6B3H' },
    { id: 6, name: 'Takeaway Bags', type: 'Receipt', status: 'Active', totalScans: 1856, scansToday: 23, conversions: 1287, lastScan: '37 min ago', destination: 'https://returnly.app/sole-maple/takeaway', createdAt: 'Jun 22, 2026', code: 'RTLY-RC-9W5J' },
    { id: 7, name: 'Summer Patio', type: 'Table', status: 'Inactive', totalScans: 532, scansToday: 0, conversions: 351, lastScan: 'Jul 2, 8:16 PM', destination: 'https://returnly.app/sole-maple/patio', createdAt: 'Jul 1, 2026', code: 'RTLY-TB-7N8R' },
  ]);

  createQrCode(draft: QrCodeDraft): QrCode {
    const id = Math.max(0, ...this.qrCodes().map((item) => item.id)) + 1;
    const created: QrCode = {
      ...draft,
      id,
      totalScans: 0,
      scansToday: 0,
      conversions: 0,
      lastScan: 'Never',
      createdAt: this.formattedDate(),
      code: `RTLY-${draft.type.slice(0, 2).toUpperCase()}-${this.randomCode()}`,
    };
    this.qrCodes.update((items) => [created, ...items]);
    return created;
  }

  updateQrCode(id: number, draft: QrCodeDraft): void {
    this.qrCodes.update((items) => items.map((item) => item.id === id ? { ...item, ...draft } : item));
  }

  deleteQrCode(id: number): void {
    this.qrCodes.update((items) => items.filter((item) => item.id !== id));
  }

  setStatus(id: number, status: QrCodeStatus): void {
    this.qrCodes.update((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  }

  qrSvg(qrCode: QrCode, size = 480): string {
    const cells = this.matrix(qrCode.code);
    const quiet = 3;
    const cellSize = size / (cells.length + quiet * 2);
    const blocks = cells.flatMap((row, y) => row.map((dark, x) =>
      dark ? `<rect x="${(x + quiet) * cellSize}" y="${(y + quiet) * cellSize}" width="${cellSize + .15}" height="${cellSize + .15}" rx="${cellSize * .08}"/>` : '',
    )).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" rx="16" fill="white"/><g fill="#211d29">${blocks}</g><rect x="${size / 2 - 24}" y="${size / 2 - 24}" width="48" height="48" rx="10" fill="white"/><rect x="${size / 2 - 18}" y="${size / 2 - 18}" width="36" height="36" rx="8" fill="#6952e8"/><text x="50%" y="51.5%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial" font-weight="700" font-size="16">R</text></svg>`;
  }

  matrix(seed: string): boolean[][] {
    const size = 21;
    const hash = [...seed].reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
    return Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => {
        const finder = this.finderCell(x, y, 0, 0) || this.finderCell(x, y, size - 7, 0) || this.finderCell(x, y, 0, size - 7);
        if (finder !== null) return finder;
        return Math.abs((hash + x * 17 + y * 31 + x * y * 7) % 11) < 5;
      }),
    );
  }

  private finderCell(x: number, y: number, startX: number, startY: number): boolean | null {
    if (x < startX || x > startX + 6 || y < startY || y > startY + 6) return null;
    const dx = x - startX;
    const dy = y - startY;
    return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  }

  private randomCode(): string {
    return Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  private formattedDate(): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  }
}
