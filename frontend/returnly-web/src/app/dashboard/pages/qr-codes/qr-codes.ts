import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { finalize } from 'rxjs';
import { SCAN_BASE_URL } from '../../../core/config/scan-url.config';
import { QrCodeDto } from '../../../core/models/qr-code.model';
import { QrCodeApiService } from '../../../core/services/qr-code-api.service';
import { RestaurantProfileApiService } from '../../../core/services/restaurant-profile-api.service';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { QrFormModalComponent } from '../../components/qr-form-modal/qr-form-modal';
import { QrImageComponent } from '../../components/qr-image/qr-image';
import { QrPreviewComponent } from '../../components/qr-preview/qr-preview';
import { QrTypeIconComponent } from '../../components/qr-type-icon/qr-type-icon';
import { QrCode, QrCodeDraft, QrCodeStatus, QrCodeType } from '../../models/dashboard.models';

type TypeFilter = 'All types' | QrCodeType;
type StatusFilter = 'All statuses' | QrCodeStatus;

@Component({
  selector: 'app-qr-codes-page',
  imports: [
    FormsModule,
    PageHeaderComponent,
    QrImageComponent,
    QrPreviewComponent,
    QrFormModalComponent,
    QrTypeIconComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './qr-codes.html',
  styleUrls: ['./qr-codes.scss', './qr-codes-polish.scss'],
})
export class QrCodesPage {
  private readonly qrCodeApi = inject(QrCodeApiService);
  private readonly profileApi = inject(RestaurantProfileApiService);
  private readonly scanBaseUrl = inject(SCAN_BASE_URL);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly qrCodeRecords = signal<QrCode[]>([]);

  protected readonly search = signal('');
  protected readonly typeFilter = signal<TypeFilter>('All types');
  protected readonly statusFilter = signal<StatusFilter>('All statuses');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly types: TypeFilter[] = ['All types', 'Table', 'Receipt', 'General'];
  protected readonly statuses: StatusFilter[] = ['All statuses', 'Active', 'Inactive'];

  protected readonly qrCodes = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.qrCodeRecords().filter((item) =>
      (!term || item.name.toLowerCase().includes(term) || item.token.toLowerCase().includes(term)) &&
      (this.typeFilter() === 'All types' || item.type === this.typeFilter()) &&
      (this.statusFilter() === 'All statuses' || item.status === this.statusFilter()),
    );
  });
  protected readonly selectedQr = computed(() =>
    this.qrCodeRecords().find((item) => item.id === this.selectedId())
      ?? this.qrCodeRecords()[0]
      ?? null,
  );
  protected readonly deletingQr = computed(() =>
    this.qrCodeRecords().find((item) => item.id === this.deletingId()) ?? null,
  );
  protected readonly activeCount = computed(() =>
    this.qrCodeRecords().filter((item) => item.status === 'Active').length);
  protected readonly totalScans = computed(() =>
    this.qrCodeRecords().reduce((total, item) => total + item.totalScans, 0));
  protected readonly totalPointsAwarded = computed(() =>
    this.qrCodeRecords().reduce(
      (total, item) => total + item.totalScans * item.pointsPerScan,
      0,
    ));
  protected readonly averagePoints = computed(() => {
    const codes = this.qrCodeRecords();
    return codes.length
      ? codes.reduce((total, item) => total + item.pointsPerScan, 0) / codes.length
      : 0;
  });

  constructor() {
    this.loadQrCodes();
  }

  protected openCreate(): void {
    this.formOpen.set(true);
  }

  protected saveQrCode(draft: QrCodeDraft): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.qrCodeApi.createQrCode({
      name: draft.name,
      type: draft.type,
      pointsPerScan: draft.pointsPerScan,
      isActive: draft.status === 'Active',
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const created = this.toViewQrCode(response.data);
          this.qrCodeRecords.update((items) => [created, ...items]);
          this.selectedId.set(created.id);
          this.formOpen.set(false);
        },
        error: () => this.errorMessage.set('The QR code could not be created. Please try again.'),
      });
  }

  protected setStatus(qrCode: QrCode, status: QrCodeStatus): void {
    if (!qrCode.apiId) return;

    this.errorMessage.set(null);
    this.qrCodeApi.setStatus(qrCode.apiId, { isActive: status === 'Active' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updated = this.toViewQrCode(response.data);
          this.qrCodeRecords.update((items) =>
            items.map((item) => item.id === qrCode.id ? updated : item));
        },
        error: () => this.errorMessage.set('The QR code status could not be updated.'),
      });
  }

  protected confirmDelete(): void {
    const qrCode = this.deletingQr();
    if (!qrCode?.apiId) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.qrCodeApi.deleteQrCode(qrCode.apiId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.qrCodeRecords.update((items) => items.filter((item) => item.id !== qrCode.id));
          if (this.selectedId() === qrCode.id) {
            this.selectedId.set(this.qrCodeRecords()[0]?.id ?? null);
          }
          this.deletingId.set(null);
        },
        error: () => this.errorMessage.set('The QR code could not be deleted. Please try again.'),
      });
  }

  protected async downloadQr(qrCode: QrCode): Promise<void> {
    const imageUrl = await this.brandedQrImage(qrCode, 1200);
    const anchor = document.createElement('a');
    anchor.href = imageUrl;
    anchor.download = `${this.fileName(qrCode.name)}-qr.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  protected async printQr(qrCode: QrCode): Promise<void> {
    const imageUrl = await this.brandedQrImage(qrCode, 900);
    const printWindow = window.open('', '_blank', 'width=720,height=820');
    if (!printWindow) return;
    const safeName = this.escapeHtml(qrCode.name);
    printWindow.document.write(`<!doctype html><html><head><title>Print ${safeName}</title><style>body{display:grid;min-height:95vh;place-items:center;margin:0;font-family:Arial;color:#211d29}.sheet{text-align:center}img{width:min(620px,90vw);height:auto}@media print{body{min-height:auto}.sheet{break-inside:avoid}}</style></head><body><main class="sheet"><img src="${imageUrl}" alt="QR code for ${safeName}"></main><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`);
    printWindow.document.close();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.typeFilter.set('All types');
    this.statusFilter.set('All statuses');
    if (this.errorMessage()) this.loadQrCodes();
  }

  private loadQrCodes(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.qrCodeApi.getQrCodes({ page: 1, pageSize: 100 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const qrCodes = response.data.items.map((item) => this.toViewQrCode(item));
          this.qrCodeRecords.set(qrCodes);
          this.selectedId.set(qrCodes[0]?.id ?? null);
        },
        error: () => {
          this.qrCodeRecords.set([]);
          this.errorMessage.set('QR codes could not be loaded. Check the API connection and try again.');
        },
      });
  }

  private toViewQrCode(qrCode: QrCodeDto): QrCode {
    return {
      id: this.numericId(qrCode.id),
      apiId: qrCode.id,
      name: qrCode.name,
      type: qrCode.type,
      status: qrCode.isActive ? 'Active' : 'Inactive',
      totalScans: qrCode.totalScans,
      scansToday: 0,
      conversions: qrCode.totalScans,
      lastScan: qrCode.lastScannedAt ? this.formatDate(qrCode.lastScannedAt) : 'Never',
      createdAt: this.formatDate(qrCode.createdAt),
      token: qrCode.token,
      pointsPerScan: qrCode.pointsPerScan,
    };
  }

  private qrImage(token: string, width: number): Promise<string> {
    const baseUrl = this.scanBaseUrl.replace(/\/+$/, '');
    const scanUrl = `${baseUrl}/scan/${encodeURIComponent(token)}`;
    return QRCode.toDataURL(scanUrl, {
      width,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#211d29', light: '#ffffff' },
    });
  }

  private async brandedQrImage(qrCode: QrCode, width: number): Promise<string> {
    const profile = this.profileApi.profile();
    const qr = await this.loadImage(await this.qrImage(qrCode.token, Math.round(width * .64)));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(width * 1.28);
    const context = canvas.getContext('2d');
    if (!context) return qr.src;

    const brand = profile?.primaryBrandColor || '#6952e8';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = brand;
    context.fillRect(0, 0, canvas.width, Math.round(width * .18));
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.font = `700 ${Math.round(width * .052)}px Arial`;
    context.fillText(profile?.name || 'Returnly Restaurant', width / 2, width * .105);
    if (profile?.logoUrl) {
      try {
        const logo = await this.loadImage(profile.logoUrl);
        const logoSize = width * .1;
        context.save();
        context.beginPath();
        context.arc(width * .095, width * .09, logoSize / 2, 0, Math.PI * 2);
        context.clip();
        context.drawImage(logo, width * .045, width * .04, logoSize, logoSize);
        context.restore();
      } catch {
        // Keep the printable asset usable if a remote logo is temporarily unavailable.
      }
    }

    const qrSize = width * .68;
    context.drawImage(qr, (width - qrSize) / 2, width * .225, qrSize, qrSize);
    context.fillStyle = '#211d29';
    context.font = `700 ${Math.round(width * .046)}px Arial`;
    context.fillText(qrCode.name, width / 2, width * .99);
    context.fillStyle = '#716b79';
    context.font = `400 ${Math.round(width * .027)}px Arial`;
    context.fillText(
      `Scan to earn ${qrCode.pointsPerScan.toLocaleString()} loyalty points`,
      width / 2,
      width * 1.05,
    );
    context.fillStyle = brand;
    context.font = `700 ${Math.round(width * .025)}px Arial`;
    context.fillText('POWERED BY RETURNLY', width / 2, width * 1.17);
    return canvas.toDataURL('image/png');
  }

  private loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  private numericId(id: string): number {
    return [...id].reduce(
      (hash, character) => ((hash * 31) + character.charCodeAt(0)) | 0,
      7,
    ) >>> 0;
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private fileName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
    );
  }
}
