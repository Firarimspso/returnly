import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CampaignType } from '../../models/dashboard.models';

@Component({
  selector: 'app-campaign-type-icon',
  templateUrl: './campaign-type-icon.html',
  styleUrl: './campaign-type-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignTypeIconComponent {
  readonly type = input.required<CampaignType>();
}
