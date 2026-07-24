import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { QrFormModalComponent } from '../../components/qr-form-modal/qr-form-modal';
import { QrPreviewComponent } from '../../components/qr-preview/qr-preview';
import { QrCode, QrCodeDraft, QrCodeStatus, QrCodeType } from '../../models/dashboard.models';
import { QrCodeDataService } from '../../services/qr-code-data';

type TypeFilter = 'All types' | QrCodeType;
type StatusFilter = 'All statuses' | QrCodeStatus;

@Component({
  selector: 'app-qr-codes-page',
  imports: [FormsModule, PageHeaderComponent, QrPreviewComponent, QrFormModalComponent, ConfirmationDialogComponent],
  templateUrl: './qr-codes.html',
  styleUrl: './qr-codes.scss',
})
export class QrCodesPage {
  protected readonly qrData = inject(QrCodeDataService);
  protected readonly search = signal('');
  protected readonly typeFilter = signal<TypeFilter>('All types');
  protected readonly statusFilter = signal<StatusFilter>('All statuses');
  protected readonly selectedId = signal<number | null>(1);
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly types: TypeFilter[] = ['All types', 'Table', 'Receipt', 'General'];
  protected readonly statuses: StatusFilter[] = ['All statuses', 'Active', 'Inactive'];

  protected readonly qrCodes = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.qrData.qrCodes().filter((item) =>
      (!term || item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term)) &&
      (this.typeFilter() === 'All types' || item.type === this.typeFilter()) &&
      (this.statusFilter() === 'All statuses' || item.status === this.statusFilter()),
    );
  });
  protected readonly selectedQr = computed(() =>
    this.qrData.qrCodes().find((item) => item.id === this.selectedId()) ?? this.qrData.qrCodes()[0] ?? null,
  );
  protected readonly editingQr = computed(() =>
    this.qrData.qrCodes().find((item) => item.id === this.editingId()) ?? null,
  );
  protected readonly deletingQr = computed(() =>
    this.qrData.qrCodes().find((item) => item.id === this.deletingId()) ?? null,
  );
  protected readonly activeCount = computed(() => this.qrData.qrCodes().filter((item) => item.status === 'Active').length);
  protected readonly totalScans = computed(() => this.qrData.qrCodes().reduce((total, item) => total + item.totalScans, 0));
  protected readonly scansToday = computed(() => this.qrData.qrCodes().reduce((total, item) => total + item.scansToday, 0));
  protected readonly conversionRate = computed(() => {
    const scans = this.totalScans();
    const conversions = this.qrData.qrCodes().reduce((total, item) => total + item.conversions, 0);
    return scans ? conversions / scans * 100 : 0;
  });

  protected openCreate(): void {
    this.editingId.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(qrCode: QrCode): void {
    this.editingId.set(qrCode.id);
    this.formOpen.set(true);
  }

  protected saveQrCode(draft: QrCodeDraft): void {
    const editingId = this.editingId();
    if (editingId === null) {
      const created = this.qrData.createQrCode(draft);
      this.selectedId.set(created.id);
    } else {
      this.qrData.updateQrCode(editingId, draft);
      this.selectedId.set(editingId);
    }
    this.closeForm();
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  protected confirmDelete(): void {
    const deletingId = this.deletingId();
    if (deletingId === null) return;
    this.qrData.deleteQrCode(deletingId);
    if (this.selectedId() === deletingId) this.selectedId.set(this.qrData.qrCodes()[0]?.id ?? null);
    this.deletingId.set(null);
  }

  protected downloadQr(qrCode: QrCode): void {
    const blob = new Blob([this.qrData.qrSvg(qrCode)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.fileName(qrCode.name)}-qr.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  protected printQr(qrCode: QrCode): void {
    const printWindow = window.open('', '_blank', 'width=720,height=820');
    if (!printWindow) return;
    const safeName = this.escapeHtml(qrCode.name);
    printWindow.document.write(`<!doctype html><html><head><title>Print ${safeName}</title><style>body{display:grid;min-height:95vh;place-items:center;margin:0;font-family:Arial;color:#211d29}.sheet{text-align:center}svg{width:420px;height:420px}h1{margin:24px 0 8px;font-size:28px}p{margin:0;color:#716b79}@media print{body{min-height:auto}.sheet{break-inside:avoid}}</style></head><body><main class="sheet">${this.qrData.qrSvg(qrCode, 520)}<h1>${safeName}</h1><p>Scan to earn points and unlock rewards at Solé & Maple.</p></main><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`);
    printWindow.document.close();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.typeFilter.set('All types');
    this.statusFilter.set('All statuses');
  }

  private fileName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
  }
}
