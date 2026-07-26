import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  DashboardAnalyticsDto,
  DashboardRecentActivityDto,
} from '../../../core/models/dashboard-analytics.model';
import { DashboardAnalyticsApiService } from '../../../core/services/dashboard-analytics-api.service';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { PageHeaderComponent } from '../../components/page-header/page-header';

@Component({
  selector: 'app-overview-page',
  imports: [PageHeaderComponent, KpiCardComponent],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class OverviewPage {
  private readonly analyticsApi = inject(DashboardAnalyticsApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly analytics = signal<DashboardAnalyticsDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly chartMaximum = computed(() =>
    Math.max(1, ...this.analytics()?.activityTrend.map((point) => point.count) ?? [0]));
  protected readonly chartBars = computed(() =>
    this.analytics()?.activityTrend.map((point) =>
      point.count === 0 ? 0 : Math.max(8, point.count * 100 / this.chartMaximum())) ?? []);
  protected readonly chartLabels = computed(() => {
    const points = this.analytics()?.activityTrend ?? [];
    if (!points.length) return [];
    const indexes = [0, Math.floor((points.length - 1) / 3), Math.floor((points.length - 1) * 2 / 3), points.length - 1];
    return indexes.map((index) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
        .format(new Date(`${points[index].date}T00:00:00`)));
  });
  protected readonly redemptionGradient = computed(() => {
    const breakdown = this.analytics()?.redemptionBreakdown ?? [];
    if (!breakdown.length) return '#ece8fb';

    const colors = ['#6952e8', '#9b83ef', '#d1c7f8', '#ece8fb'];
    let start = 0;
    const stops = breakdown.map((item, index) => {
      const end = start + item.percentage;
      const stop = `${colors[index % colors.length]} ${start}% ${end}%`;
      start = end;
      return stop;
    });
    return `conic-gradient(${stops.join(',')})`;
  });

  constructor() {
    this.analyticsApi.getAnalytics()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => this.analytics.set(response.data),
        error: () => this.errorMessage.set('Dashboard analytics could not be loaded. Please try again.'),
      });
  }

  protected formatNumber(value: number): string {
    return value.toLocaleString();
  }

  protected initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }

  protected tone(customerId: string): string {
    const colors = ['#7857d9', '#d56f66', '#3f9d7c', '#c48736', '#487abf', '#995fa7'];
    const hash = [...customerId].reduce(
      (value, character) => ((value * 31) + character.charCodeAt(0)) | 0,
      7,
    ) >>> 0;
    return colors[hash % colors.length];
  }

  protected activityAction(activity: DashboardRecentActivityDto): string {
    return activity.type === 'Earn'
      ? `Earned ${activity.points.toLocaleString()} points`
      : `Redeemed ${activity.points.toLocaleString()} points`;
  }

  protected relativeTime(value: string): string {
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (elapsedMinutes < 1) return 'Just now';
    if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours} hr ago`;
    return `${Math.floor(elapsedHours / 24)} d ago`;
  }
}
