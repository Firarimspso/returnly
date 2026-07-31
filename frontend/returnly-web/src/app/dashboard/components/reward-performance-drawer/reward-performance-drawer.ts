import { Component, HostListener, input, output } from '@angular/core';
import { Reward } from '../../models/dashboard.models';
import { RewardCategoryIconComponent } from '../reward-category-icon/reward-category-icon';
import { RewardVisualIconComponent } from '../reward-visual-icon/reward-visual-icon';

@Component({
  selector: 'app-reward-performance-drawer',
  imports: [RewardCategoryIconComponent, RewardVisualIconComponent],
  templateUrl: './reward-performance-drawer.html',
  styleUrls: ['./reward-performance-drawer.scss', './reward-performance-drawer-polish.scss'],
})
export class RewardPerformanceDrawerComponent {
  readonly reward = input.required<Reward>();
  readonly popularityRank = input.required<number>();
  readonly totalRewards = input.required<number>();
  readonly closed = output<void>();

  protected redemptionLabel(count: number): string {
    return `Redeemed ${count.toLocaleString()} ${count === 1 ? 'time' : 'times'}`;
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.closed.emit();
  }
}
