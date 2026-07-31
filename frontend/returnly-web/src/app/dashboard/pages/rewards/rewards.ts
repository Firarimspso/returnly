import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { RewardDto, RewardUpsertRequest } from '../../../core/models/reward.model';
import { RewardApiService } from '../../../core/services/reward-api.service';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { RewardCategoryIconComponent } from '../../components/reward-category-icon/reward-category-icon';
import { RewardFormModalComponent } from '../../components/reward-form-modal/reward-form-modal';
import { RewardPerformanceDrawerComponent } from '../../components/reward-performance-drawer/reward-performance-drawer';
import {
  normalizeRewardIcon,
  RewardVisualIconComponent,
} from '../../components/reward-visual-icon/reward-visual-icon';
import { Reward, RewardCategory, RewardDraft } from '../../models/dashboard.models';

type RewardStatusFilter = 'All' | 'Active' | 'Inactive';
type RewardCategoryFilter = 'All categories' | RewardCategory;
type RewardView = 'grid' | 'table';

@Component({
  selector: 'app-rewards-page',
  imports: [
    FormsModule,
    PageHeaderComponent,
    RewardCategoryIconComponent,
    RewardVisualIconComponent,
    RewardFormModalComponent,
    ConfirmationDialogComponent,
    RewardPerformanceDrawerComponent,
  ],
  templateUrl: './rewards.html',
  styleUrls: ['./rewards.scss', './rewards-icons.scss', './rewards-final-polish.scss'],
})
export class RewardsPage {
  private readonly rewardApi = inject(RewardApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rewardRecords = signal<Reward[]>([]);
  protected readonly data = {
    rewards: this.rewardRecords.asReadonly(),
  };
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<RewardStatusFilter>('All');
  protected readonly categoryFilter = signal<RewardCategoryFilter>('All categories');
  protected readonly view = signal<RewardView>('grid');
  protected readonly formOpen = signal(false);
  protected readonly editingRewardId = signal<number | null>(null);
  protected readonly deletingRewardId = signal<number | null>(null);
  protected readonly performanceRewardId = signal<number | null>(null);
  protected readonly statusOptions: RewardStatusFilter[] = ['All', 'Active', 'Inactive'];
  protected readonly categories: RewardCategoryFilter[] = ['All categories', 'Food', 'Drinks', 'Discount', 'Experience'];

  protected readonly rewards = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.data.rewards().filter((reward) =>
      (!term || reward.name.toLowerCase().includes(term) || reward.description.toLowerCase().includes(term)) &&
      (this.statusFilter() === 'All' || reward.active === (this.statusFilter() === 'Active')) &&
      (this.categoryFilter() === 'All categories' || reward.category === this.categoryFilter()),
    );
  });
  protected readonly activeRewards = computed(() => this.data.rewards().filter((reward) => reward.active).length);
  protected readonly totalRedemptions = computed(() => this.data.rewards().reduce((sum, reward) => sum + reward.redemptions, 0));
  protected readonly popularReward = computed(() =>
    this.data.rewards().reduce<Reward | null>(
      (popular, reward) => !popular || reward.redemptions > popular.redemptions ? reward : popular,
      null,
    ),
  );
  protected readonly editingReward = computed(() =>
    this.data.rewards().find((reward) => reward.id === this.editingRewardId()) ?? null,
  );
  protected readonly deletingReward = computed(() =>
    this.data.rewards().find((reward) => reward.id === this.deletingRewardId()) ?? null,
  );
  protected readonly performanceReward = computed(() =>
    this.data.rewards().find((reward) => reward.id === this.performanceRewardId()) ?? null,
  );

  constructor() {
    this.loadRewards();
  }

  protected openAdd(): void {
    this.editingRewardId.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(reward: Reward): void {
    this.editingRewardId.set(reward.id);
    this.formOpen.set(true);
  }

  protected duplicateReward(reward: Reward): void {
    const request = this.toRequest({
      ...reward,
      name: `${reward.name} Copy`.slice(0, 60),
      active: false,
    });
    this.loading.set(true);
    this.errorMessage.set(null);
    this.rewardApi.createReward(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.rewardRecords.update((rewards) => [this.toViewReward(response.data), ...rewards]);
        },
        error: () => this.errorMessage.set('The reward could not be duplicated. Please try again.'),
      });
  }

  protected pointLabel(points: number): string {
    return `${points.toLocaleString()} pts`;
  }

  protected redemptionLabel(redemptions: number): string {
    return `Redeemed ${redemptions.toLocaleString()} ${redemptions === 1 ? 'time' : 'times'}`;
  }

  protected popularityRank(reward: Reward): number {
    return [...this.data.rewards()]
      .sort((first, second) => second.redemptions - first.redemptions)
      .findIndex((item) => item.id === reward.id) + 1;
  }

  protected saveReward(draft: RewardDraft): void {
    const rewardId = this.editingRewardId();
    const existingReward = rewardId === null
      ? null
      : this.rewardRecords().find((reward) => reward.id === rewardId) ?? null;
    const request = this.toRequest(draft);
    const operation = existingReward?.apiId
      ? this.rewardApi.updateReward(existingReward.apiId, request)
      : this.rewardApi.createReward(request);

    this.loading.set(true);
    this.errorMessage.set(null);
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const savedReward = this.toViewReward(response.data);
          this.rewardRecords.update((rewards) =>
            existingReward
              ? rewards.map((reward) => reward.id === existingReward.id ? savedReward : reward)
              : [savedReward, ...rewards],
          );
          this.closeForm();
        },
        error: () => this.errorMessage.set('The reward could not be saved. Please try again.'),
      });
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingRewardId.set(null);
  }

  protected confirmDelete(): void {
    const rewardId = this.deletingRewardId();
    const reward = this.rewardRecords().find((item) => item.id === rewardId);
    if (!reward?.apiId) {
      this.deletingRewardId.set(null);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.rewardApi.deleteReward(reward.apiId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.rewardRecords.update((rewards) => rewards.filter((item) => item.id !== reward.id));
          this.deletingRewardId.set(null);
        },
        error: () => this.errorMessage.set('The reward could not be deleted. Please try again.'),
      });
  }

  protected setRewardActive(reward: Reward, active: boolean): void {
    if (!reward.apiId) return;

    this.errorMessage.set(null);
    this.rewardApi.updateReward(reward.apiId, this.toRequest({ ...reward, active }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updatedReward = this.toViewReward(response.data);
          this.rewardRecords.update((rewards) =>
            rewards.map((item) => item.id === reward.id ? updatedReward : item),
          );
        },
        error: () => this.errorMessage.set('The reward status could not be updated. Please try again.'),
      });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('All');
    this.categoryFilter.set('All categories');
    if (this.errorMessage()) this.loadRewards();
  }

  private loadRewards(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.rewardApi.getRewards({ page: 1, pageSize: 100 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.rewardRecords.set(response.data.items.map((reward) => this.toViewReward(reward)));
        },
        error: () => {
          this.rewardRecords.set([]);
          this.errorMessage.set('Rewards could not be loaded. Check the API connection and sign in again.');
        },
      });
  }

  private toRequest(reward: RewardDraft): RewardUpsertRequest {
    return {
      name: reward.name,
      description: reward.description,
      requiredPoints: reward.points,
      isActive: reward.active,
      category: reward.category,
      icon: reward.icon || null,
      color: reward.color || null,
    };
  }

  private toViewReward(reward: RewardDto): Reward {
    return {
      id: this.numericId(reward.id),
      apiId: reward.id,
      name: reward.name,
      description: reward.description,
      points: reward.requiredPoints,
      active: reward.isActive,
      icon: normalizeRewardIcon(reward.icon, reward.category),
      imageUrl: null,
      redemptions: reward.totalRedemptions,
      category: reward.category,
      createdAt: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(reward.createdAt)),
      color: reward.color || '#6952e8',
    };
  }

  private numericId(id: string): number {
    return [...id].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) | 0, 7) >>> 0;
  }
}
