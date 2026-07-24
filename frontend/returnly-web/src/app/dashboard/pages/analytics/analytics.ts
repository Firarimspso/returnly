import { Component } from '@angular/core';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { PageHeaderComponent } from '../../components/page-header/page-header';

@Component({ selector: 'app-analytics-page', imports: [PageHeaderComponent, KpiCardComponent], templateUrl: './analytics.html', styleUrl: './analytics.scss' })
export class AnalyticsPage {
  protected readonly line = [24, 35, 29, 48, 42, 63, 58, 76, 68, 83, 78, 91];
}
