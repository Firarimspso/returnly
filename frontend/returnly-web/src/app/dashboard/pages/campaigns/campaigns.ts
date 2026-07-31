import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampaignFormModalComponent } from '../../components/campaign-form-modal/campaign-form-modal';
import { CampaignTypeIconComponent } from '../../components/campaign-type-icon/campaign-type-icon';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { Campaign, CampaignDraft, CampaignStatus, CampaignType } from '../../models/dashboard.models';
import { CampaignDataService } from '../../services/campaign-data';

type CampaignDisplayStatus = CampaignStatus | 'Expired';
type StatusFilter = 'All statuses' | CampaignDisplayStatus;
type TypeFilter = 'All types' | CampaignType;

@Component({
  selector: 'app-campaigns-page',
  imports: [FormsModule, PageHeaderComponent, CampaignFormModalComponent, CampaignTypeIconComponent, ConfirmationDialogComponent],
  templateUrl: './campaigns.html',
  styleUrls: ['./campaigns.scss', './campaigns-polish.scss'],
})
export class CampaignsPage {
  protected readonly campaignData = inject(CampaignDataService);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('All statuses');
  protected readonly typeFilter = signal<TypeFilter>('All types');
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly statuses: StatusFilter[] = ['All statuses', 'Active', 'Scheduled', 'Draft', 'Completed', 'Expired'];
  protected readonly types: TypeFilter[] = ['All types', 'Bonus Points', 'Discount', 'Free Reward'];

  protected readonly campaigns = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.campaignData.campaigns().filter((campaign) =>
      (!term || campaign.name.toLowerCase().includes(term) || campaign.message.toLowerCase().includes(term)) &&
      (this.statusFilter() === 'All statuses' || this.displayStatus(campaign) === this.statusFilter()) &&
      (this.typeFilter() === 'All types' || campaign.type === this.typeFilter()),
    );
  });
  protected readonly activeCount = computed(() => this.campaignData.campaigns().filter((item) => item.status === 'Active').length);
  protected readonly totalSent = computed(() => this.campaignData.campaigns().reduce((sum, item) => sum + item.sent, 0));
  protected readonly totalConversions = computed(() => this.campaignData.campaigns().reduce((sum, item) => sum + item.conversions, 0));
  protected readonly averageConversion = computed(() => this.totalSent() ? this.totalConversions() / this.totalSent() * 100 : 0);
  protected readonly revenueInfluenced = computed(() => this.campaignData.campaigns().reduce((sum, item) => sum + item.revenueInfluenced, 0));
  protected readonly editingCampaign = computed(() =>
    this.campaignData.campaigns().find((campaign) => campaign.id === this.editingId()) ?? null,
  );
  protected readonly deletingCampaign = computed(() =>
    this.campaignData.campaigns().find((campaign) => campaign.id === this.deletingId()) ?? null,
  );

  protected openCreate(): void {
    this.editingId.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(campaign: Campaign): void {
    this.editingId.set(campaign.id);
    this.formOpen.set(true);
  }

  protected saveCampaign(draft: CampaignDraft): void {
    const id = this.editingId();
    if (id === null) this.campaignData.createCampaign(draft);
    else this.campaignData.updateCampaign(id, draft);
    this.closeForm();
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  protected confirmDelete(): void {
    const id = this.deletingId();
    if (id !== null) this.campaignData.deleteCampaign(id);
    this.deletingId.set(null);
  }

  protected toggleCampaign(campaign: Campaign): void {
    this.campaignData.setStatus(campaign.id, campaign.status === 'Active' ? 'Paused' : 'Active');
  }

  protected openRate(campaign: Campaign): number {
    return campaign.sent ? campaign.opened / campaign.sent * 100 : 0;
  }

  protected conversionRate(campaign: Campaign): number {
    return campaign.sent ? campaign.conversions / campaign.sent * 100 : 0;
  }

  protected formatSchedule(campaign: Campaign): string {
    const format = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
    return `${format(campaign.startDate)} – ${format(campaign.endDate)}`;
  }

  protected displayStatus(campaign: Campaign): CampaignDisplayStatus {
    const today = new Date().toISOString().slice(0, 10);
    return campaign.status !== 'Completed' && campaign.endDate < today
      ? 'Expired'
      : campaign.status;
  }

  protected campaignValue(campaign: Campaign): string {
    if (campaign.type === 'Bonus Points') return `+${campaign.incentiveValue.toLocaleString()} bonus points`;
    if (campaign.type === 'Discount') return `${campaign.incentiveValue.toLocaleString()}% discount`;
    if (campaign.type === 'Free Reward') {
      return campaign.message.replace(/^Free reward campaign:\s*/i, '') || 'Free reward';
    }
    return campaign.message;
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('All statuses');
    this.typeFilter.set('All types');
  }
}
