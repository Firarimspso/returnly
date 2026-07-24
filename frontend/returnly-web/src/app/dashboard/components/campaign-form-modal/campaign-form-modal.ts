import { Component, computed, effect, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Campaign, CampaignAudience, CampaignDraft, CampaignStatus, CampaignType,
} from '../../models/dashboard.models';

@Component({
  selector: 'app-campaign-form-modal',
  imports: [FormsModule],
  templateUrl: './campaign-form-modal.html',
  styleUrl: './campaign-form-modal.scss',
})
export class CampaignFormModalComponent {
  readonly campaign = input<Campaign | null>(null);
  readonly closed = output<void>();
  readonly saved = output<CampaignDraft>();

  protected readonly name = signal('');
  protected readonly type = signal<CampaignType>('Bonus Points');
  protected readonly audience = signal<CampaignAudience>('All Customers');
  protected readonly status = signal<CampaignStatus>('Draft');
  protected readonly message = signal('');
  protected readonly incentiveValue = signal<number | null>(null);
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly error = signal('');
  protected readonly types: { value: CampaignType; icon: string }[] = [
    { value: 'Bonus Points', icon: '✦' }, { value: 'Free Reward', icon: '◇' },
    { value: 'Discount', icon: '%' }, { value: 'Birthday Reward', icon: '♛' },
    { value: 'Seasonal Promotion', icon: '❋' },
  ];
  protected readonly audiences: CampaignAudience[] = [
    'All Customers', 'VIP Members', 'New Customers', 'Inactive Customers', 'Birthday Customers',
  ];
  protected readonly launchOptions: { value: CampaignStatus; title: string; description: string }[] = [
    { value: 'Active', title: 'Start now', description: 'Launch as soon as it is saved' },
    { value: 'Scheduled', title: 'Schedule', description: 'Launch automatically on the start date' },
    { value: 'Draft', title: 'Save draft', description: 'Keep editing before launch' },
    { value: 'Paused', title: 'Keep paused', description: 'Save without sending new messages' },
  ];
  protected readonly incentiveLabel = computed(() => ({
    'Bonus Points': 'Points multiplier',
    'Free Reward': 'Reward point value',
    'Discount': 'Discount percentage',
    'Birthday Reward': 'Reward point value',
    'Seasonal Promotion': 'Offer percentage',
  })[this.type()]);
  protected readonly incentiveSuffix = computed(() =>
    ['Discount', 'Seasonal Promotion'].includes(this.type()) ? '%' : this.type() === 'Bonus Points' ? '×' : 'points',
  );

  constructor() {
    effect(() => {
      const campaign = this.campaign();
      if (!campaign) return;
      this.name.set(campaign.name);
      this.type.set(campaign.type);
      this.audience.set(campaign.audience);
      this.status.set(campaign.status === 'Completed' ? 'Draft' : campaign.status);
      this.message.set(campaign.message);
      this.incentiveValue.set(campaign.incentiveValue);
      this.startDate.set(campaign.startDate);
      this.endDate.set(campaign.endDate);
    });
  }

  protected submit(): void {
    const value = Number(this.incentiveValue());
    if (!this.name().trim() || !this.message().trim()) {
      this.error.set('Enter a campaign name and customer message.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      this.error.set('Enter a valid incentive value.');
      return;
    }
    if (!this.startDate() || !this.endDate() || this.endDate() < this.startDate()) {
      this.error.set('Choose a valid start and end date.');
      return;
    }
    this.saved.emit({
      name: this.name().trim(), type: this.type(), audience: this.audience(), status: this.status(),
      message: this.message().trim(), incentiveValue: value, startDate: this.startDate(), endDate: this.endDate(),
    });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void { this.closed.emit(); }
}
