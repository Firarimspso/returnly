import { Component, inject } from '@angular/core';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { DashboardDataService } from '../../services/dashboard-data';

@Component({
  selector: 'app-overview-page',
  imports: [PageHeaderComponent, KpiCardComponent],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class OverviewPage {
  protected readonly data = inject(DashboardDataService);
  protected readonly chartBars = [42, 58, 49, 72, 64, 85, 76, 92, 68, 83, 79, 96];
}
