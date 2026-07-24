import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { RewardFormModalComponent } from '../../components/reward-form-modal/reward-form-modal';
import { Reward, RewardCategory, RewardDraft } from '../../models/dashboard.models';
import { DashboardDataService } from '../../services/dashboard-data';

type RewardStatusFilter = 'All' | 'Active' | 'Inactive';
type RewardCategoryFilter = 'All categories' | RewardCategory;
type RewardView = 'grid' | 'table';

@Component({
  selector: 'app-rewards-page',
  imports: [FormsModule, PageHeaderComponent, RewardFormModalComponent, ConfirmationDialogComponent],
  templateUrl: './rewards.html',
  styleUrl: './rewards.scss',
})
export class RewardsPage {
  protected readonly data = inject(DashboardDataService);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<RewardStatusFilter>('All');
  protected readonly categoryFilter = signal<RewardCategoryFilter>('All categories');
  protected readonly view = signal<RewardView>('grid');
  protected readonly formOpen = signal(false);
  protected readonly editingRewardId = signal<number | null>(null);
  protected readonly deletingRewardId = signal<number | null>(null);
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

  protected openAdd(): void {
    this.editingRewardId.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(reward: Reward): void {
    this.editingRewardId.set(reward.id);
    this.formOpen.set(true);
  }

  protected saveReward(draft: RewardDraft): void {
    const rewardId = this.editingRewardId();
    if (rewardId === null) this.data.addReward(draft);
    else this.data.updateReward(rewardId, draft);
    this.closeForm();
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingRewardId.set(null);
  }

  protected confirmDelete(): void {
    const rewardId = this.deletingRewardId();
    if (rewardId !== null) this.data.removeReward(rewardId);
    this.deletingRewardId.set(null);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('All');
    this.categoryFilter.set('All categories');
  }
}
