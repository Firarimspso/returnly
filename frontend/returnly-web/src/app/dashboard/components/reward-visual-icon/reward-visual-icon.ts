import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RewardCategory } from '../../models/dashboard.models';

export type RewardIconName =
  'coffee' | 'utensils' | 'burger' | 'cake' | 'ice-cream' | 'gift' | 'ticket' | 'percent';

const legacyIcons: Record<string, RewardIconName> = {
  '☕': 'coffee',
  '✦': 'gift',
  '%': 'percent',
  '♨': 'utensils',
  '★': 'gift',
  '◉': 'burger',
  '◇': 'ticket',
  '♛': 'cake',
};

const categoryDefaults: Record<RewardCategory, RewardIconName> = {
  Food: 'utensils',
  Drinks: 'coffee',
  Discount: 'percent',
  Experience: 'ticket',
};

export function normalizeRewardIcon(icon: string | null | undefined, category: RewardCategory): RewardIconName {
  const normalized = icon?.trim() ?? '';
  const supported: RewardIconName[] = ['coffee', 'utensils', 'burger', 'cake', 'ice-cream', 'gift', 'ticket', 'percent'];
  return legacyIcons[normalized] ?? (supported.includes(normalized as RewardIconName)
    ? normalized as RewardIconName
    : categoryDefaults[category]);
}

@Component({
  selector: 'app-reward-visual-icon',
  templateUrl: './reward-visual-icon.html',
  styleUrl: './reward-visual-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardVisualIconComponent {
  readonly icon = input<string | null>();
  readonly category = input<RewardCategory>('Experience');
  protected readonly name = computed(() => normalizeRewardIcon(this.icon(), this.category()));
}
