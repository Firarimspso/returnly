import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import {
  DashboardAnalyticsDto,
  DashboardRecentActivityDto,
} from '../../../core/models/dashboard-analytics.model';
import {
  DashboardAnalyticsApiService,
  DashboardAnalyticsPeriod,
} from '../../../core/services/dashboard-analytics-api.service';
import {
  DateRangeOption,
  DateRangeSelectorComponent,
} from '../../components/date-range-selector/date-range-selector';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { PageHeaderComponent } from '../../components/page-header/page-header';
import { RewardVisualIconComponent } from '../../components/reward-visual-icon/reward-visual-icon';
import {
  DEFAULT_DASHBOARD_RANGE,
  toDashboardAnalyticsPeriod,
} from '../../utils/dashboard-period';

@Component({
  selector: 'app-overview-page',
  imports: [PageHeaderComponent, KpiCardComponent, DateRangeSelectorComponent, RewardVisualIconComponent],
  templateUrl: './overview.html',
})
export class OverviewPage {
  private readonly analyticsApi = inject(DashboardAnalyticsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private analyticsRequest?: Subscription;

  protected readonly analytics = signal<DashboardAnalyticsDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedRange = signal<DateRangeOption>(DEFAULT_DASHBOARD_RANGE);
  protected readonly hasActivity = computed(() =>
    this.analytics()?.activityTrend.some((point) => point.count > 0) ?? false);
  protected readonly hasRedemptions = computed(() =>
    (this.analytics()?.redemptionBreakdown.length ?? 0) > 0);
  protected readonly recentActivity = computed(() =>
    this.analytics()?.recentActivity ?? []);
  protected readonly topRewards = computed(() =>
    this.analytics()?.topRewards.filter((reward) => reward.redemptions > 0) ?? []);
  protected readonly chartMaximum = computed(() =>
    Math.max(1, ...this.analytics()?.activityTrend.map((point) => point.count) ?? [0]));
  protected readonly chartBars = computed(() =>
    this.analytics()?.activityTrend.map((point) =>
      point.count === 0 ? 0 : Math.max(8, point.count * 100 / this.chartMaximum())) ?? []);
  protected readonly chartLabels = computed(() => {
    const points = this.analytics()?.activityTrend ?? [];
    if (!points.length) return [];
    const indexes = [...new Set([
      0,
      Math.floor((points.length - 1) / 3),
      Math.floor((points.length - 1) * 2 / 3),
      points.length - 1,
    ])];
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
    this.loadAnalytics('Last30Days');
  }

  protected changeRange(option: DateRangeOption): void {
    this.selectedRange.set(option);
    this.loadAnalytics(toDashboardAnalyticsPeriod(option.key));
  }

  private loadAnalytics(period: DashboardAnalyticsPeriod): void {
    this.analyticsRequest?.unsubscribe();
    this.analytics.set(null);
    this.errorMessage.set(null);
    this.loading.set(true);
    this.analyticsRequest = this.analyticsApi.getAnalytics(period)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.analytics.set(response.data);
          this.errorMessage.set(null);
        },
        error: () => {
          this.analytics.set(null);
          this.errorMessage.set('Dashboard analytics could not be loaded. Please try again.');
        },
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
