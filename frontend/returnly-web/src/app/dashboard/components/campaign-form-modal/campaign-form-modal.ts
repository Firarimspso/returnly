import { Component, DestroyRef, computed, effect, HostListener, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RewardDto } from '../../../core/models/reward.model';
import { RewardApiService } from '../../../core/services/reward-api.service';
import {
  Campaign, CampaignAudience, CampaignDraft, CampaignStatus, CampaignType,
} from '../../models/dashboard.models';
import { CampaignTypeIconComponent } from '../campaign-type-icon/campaign-type-icon';

@Component({
  selector: 'app-campaign-form-modal',
  imports: [FormsModule, CampaignTypeIconComponent],
  templateUrl: './campaign-form-modal.html',
  styleUrls: ['./campaign-form-modal.scss', './campaign-form-modal-polish.scss'],
})
export class CampaignFormModalComponent {
  private readonly rewardApi = inject(RewardApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly campaign = input<Campaign | null>(null);
  readonly closed = output<void>();
  readonly saved = output<CampaignDraft>();

  protected readonly name = signal('');
  protected readonly type = signal<CampaignType>('Bonus Points');
  protected readonly audience = signal<CampaignAudience>('All customers');
  protected readonly status = signal<CampaignStatus>('Active');
  protected readonly incentiveValue = signal<number | null>(null);
  protected readonly selectedRewardId = signal('');
  protected readonly rewards = signal<RewardDto[]>([]);
  protected readonly rewardsLoading = signal(false);
  protected readonly rewardsError = signal('');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly error = signal('');
  protected readonly types: { value: CampaignType; description: string }[] = [
    { value: 'Bonus Points', description: 'Reward visits with extra points' },
    { value: 'Discount', description: 'Offer a percentage discount' },
    { value: 'Free Reward', description: 'Promote an existing reward' },
  ];
  protected readonly audiences: CampaignAudience[] = [
    'All customers', 'Returning customers', 'VIP customers',
  ];
  protected readonly statuses: CampaignStatus[] = ['Draft', 'Active', 'Scheduled'];
  protected readonly selectedReward = computed(() =>
    this.rewards().find((reward) => reward.id === this.selectedRewardId()) ?? null);
  protected readonly previewValue = computed(() => {
    if (this.type() === 'Free Reward') return this.selectedReward()?.name || 'Select a reward';
    const value = Math.max(0, Number(this.incentiveValue()) || 0).toLocaleString();
    return this.type() === 'Discount' ? `${value}% discount` : `+${value} bonus points`;
  });
  protected readonly previewStatus = computed(() => this.resolvedStatus(false));

  constructor() {
    this.loadRewards();
    effect(() => {
      const campaign = this.campaign();
      if (!campaign) return;
      this.name.set(campaign.name);
      this.type.set(this.supportedType(campaign.type));
      this.audience.set(this.supportedAudience(campaign.audience));
      this.status.set(['Draft', 'Active', 'Scheduled'].includes(campaign.status)
        ? campaign.status
        : 'Draft');
      this.incentiveValue.set(campaign.incentiveValue);
      this.startDate.set(campaign.startDate);
      this.endDate.set(campaign.endDate);
    });
    effect(() => {
      const campaign = this.campaign();
      const rewards = this.rewards();
      if (!campaign || this.type() !== 'Free Reward' || this.selectedRewardId()) return;
      this.selectedRewardId.set(
        rewards.find((reward) => reward.requiredPoints === campaign.incentiveValue)?.id ?? '',
      );
    });
  }

  protected selectType(type: CampaignType): void {
    this.type.set(type);
    this.error.set('');
  }

  protected submit(asDraft = false): void {
    if (!this.name().trim()) {
      this.error.set('Enter a campaign name.');
      return;
    }
    const reward = this.selectedReward();
    const value = this.type() === 'Free Reward'
      ? reward?.requiredPoints
      : Number(this.incentiveValue());
    if (!Number.isFinite(value) || Number(value) <= 0) {
      this.error.set(this.type() === 'Free Reward'
        ? 'Select an active reward.'
        : `Enter a valid ${this.type() === 'Discount' ? 'percentage' : 'bonus points value'}.`);
      return;
    }
    if (!this.startDate() || !this.endDate() || this.endDate() < this.startDate()) {
      this.error.set('Choose a valid start and end date.');
      return;
    }
    this.saved.emit({
      name: this.name().trim(),
      type: this.type(),
      audience: this.audience(),
      status: this.resolvedStatus(asDraft),
      message: this.generatedMessage(reward),
      incentiveValue: Number(value),
      startDate: this.startDate(),
      endDate: this.endDate(),
    });
  }

  protected formatPreviewDate(value: string): string {
    if (!value) return 'Select date';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  }

  private resolvedStatus(asDraft: boolean): CampaignStatus {
    if (asDraft) return 'Draft';
    const today = new Date().toISOString().slice(0, 10);
    if (this.startDate() > today) return 'Scheduled';
    return this.status();
  }

  private generatedMessage(reward: RewardDto | null): string {
    if (this.type() === 'Free Reward') return `Free reward campaign: ${reward?.name ?? 'Reward'}`;
    if (this.type() === 'Discount') return `${Number(this.incentiveValue())}% customer discount`;
    return `Earn ${Number(this.incentiveValue())} bonus points`;
  }

  private supportedType(type: CampaignType): CampaignType {
    return ['Bonus Points', 'Discount', 'Free Reward'].includes(type) ? type : 'Bonus Points';
  }

  private supportedAudience(audience: CampaignAudience): CampaignAudience {
    if (['All customers', 'Returning customers', 'VIP customers'].includes(audience)) return audience;
    if (audience === 'VIP Members') return 'VIP customers';
    if (audience === 'Inactive Customers') return 'Returning customers';
    return 'All customers';
  }

  private loadRewards(): void {
    this.rewardsLoading.set(true);
    this.rewardApi.getRewards({ page: 1, pageSize: 100, isActive: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.rewards.set(response.data.items);
          this.rewardsLoading.set(false);
        },
        error: () => {
          this.rewards.set([]);
          this.rewardsLoading.set(false);
          this.rewardsError.set('Active rewards could not be loaded.');
        },
      });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void { this.closed.emit(); }
}
