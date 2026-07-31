import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RewardCategory } from '../../models/dashboard.models';

@Component({
  selector: 'app-reward-category-icon',
  templateUrl: './reward-category-icon.html',
  styleUrl: './reward-category-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardCategoryIconComponent {
  readonly category = input.required<RewardCategory>();
}
