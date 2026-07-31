import { Component, effect, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Reward, RewardCategory, RewardDraft } from '../../models/dashboard.models';
import { RewardCategoryIconComponent } from '../reward-category-icon/reward-category-icon';
import {
  normalizeRewardIcon,
  RewardIconName,
  RewardVisualIconComponent,
} from '../reward-visual-icon/reward-visual-icon';

@Component({
  selector: 'app-reward-form-modal',
  imports: [FormsModule, RewardCategoryIconComponent, RewardVisualIconComponent],
  templateUrl: './reward-form-modal.html',
  styleUrls: ['./reward-form-modal.scss', './reward-form-modal-polish.scss'],
})
export class RewardFormModalComponent {
  readonly reward = input<Reward | null>(null);
  readonly closed = output<void>();
  readonly saved = output<RewardDraft>();

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly points = signal<number | null>(null);
  protected readonly active = signal(true);
  protected readonly icon = signal<RewardIconName>('coffee');
  protected readonly category = signal<RewardCategory>('Food');
  protected readonly color = signal('#6952e8');
  protected readonly error = signal('');
  protected readonly icons: ReadonlyArray<{ name: RewardIconName; label: string }> = [
    { name: 'coffee', label: 'Coffee' },
    { name: 'utensils', label: 'Meal' },
    { name: 'burger', label: 'Burger' },
    { name: 'cake', label: 'Cake' },
    { name: 'ice-cream', label: 'Dessert' },
    { name: 'gift', label: 'Gift' },
    { name: 'ticket', label: 'Experience' },
    { name: 'percent', label: 'Discount' },
  ];
  protected readonly categories: RewardCategory[] = ['Food', 'Drinks', 'Discount', 'Experience'];
  protected readonly colors = ['#6952e8', '#d06e79', '#3b9470', '#d58a43', '#4f7fbd', '#9c63a7'];

  constructor() {
    effect(() => {
      const reward = this.reward();
      if (!reward) return;
      this.name.set(reward.name);
      this.description.set(reward.description);
      this.points.set(reward.points);
      this.active.set(reward.active);
      this.icon.set(normalizeRewardIcon(reward.icon, reward.category));
      this.category.set(reward.category);
      this.color.set(reward.color);
    });
  }

  protected submit(): void {
    const points = Math.round(Number(this.points()));
    if (!this.name().trim() || !this.description().trim()) {
      this.error.set('Enter a reward name and description.');
      return;
    }
    if (!Number.isFinite(points) || points < 1 || points > 100000) {
      this.error.set('Required points must be between 1 and 100,000.');
      return;
    }
    this.saved.emit({
      name: this.name().trim(),
      description: this.description().trim(),
      points,
      active: this.active(),
      icon: this.icon(),
      category: this.category(),
      color: this.color(),
    });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void { this.closed.emit(); }
}
