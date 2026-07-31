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
import {
  DEFAULT_DASHBOARD_RANGE,
  toDashboardAnalyticsPeriod,
} from '../../utils/dashboard-period';

@Component({
  selector: 'app-analytics-page',
  imports: [PageHeaderComponent, KpiCardComponent, DateRangeSelectorComponent],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class AnalyticsPage {
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
  protected readonly topRewards = computed(() =>
    this.analytics()?.topRewards.filter((reward) => reward.redemptions > 0) ?? []);
  protected readonly topRewardMaximum = computed(() =>
    Math.max(1, ...this.topRewards().map((reward) => reward.redemptions)));
  protected readonly chartMaximum = computed(() =>
    Math.max(1, ...this.analytics()?.activityTrend.map((point) => point.count) ?? [0]));
  protected readonly chartBars = computed(() =>
    this.analytics()?.activityTrend.map((point) =>
      point.count === 0 ? 0 : Math.max(8, point.count * 100 / this.chartMaximum())) ?? []);
  protected readonly redemptionGradient = computed(() => {
    const breakdown = this.analytics()?.redemptionBreakdown ?? [];
    if (!breakdown.length) return '#ece8fb';

    const colors = ['#6952e8', '#9b83ef', '#d1c7f8', '#ead4ca'];
    let start = 0;
    return `conic-gradient(${breakdown.map((item, index) => {
      const end = start + item.percentage;
      const stop = `${colors[index % colors.length]} ${start}% ${end}%`;
      start = end;
      return stop;
    }).join(',')})`;
  });

  constructor() {
    this.loadAnalytics('Last30Days');
  }

  protected changeRange(option: DateRangeOption): void {
    this.selectedRange.set(option);
    this.loadAnalytics(toDashboardAnalyticsPeriod(option.key));
  }

  protected retry(): void {
    this.loadAnalytics(toDashboardAnalyticsPeriod(this.selectedRange().key));
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
          this.errorMessage.set(
            `Analytics for ${this.selectedRange().label.toLowerCase()} could not be loaded. Try another range or retry.`,
          );
        },
      });
  }

  protected formatNumber(value: number): string {
    return value.toLocaleString();
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected formatChartDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  }

  protected activityLabel(item: DashboardRecentActivityDto): string {
    return item.type === 'Earn' ? 'Points earned' : 'Reward redeemed';
  }

  protected signedPoints(item: DashboardRecentActivityDto): string {
    return `${item.type === 'Earn' ? '+' : '−'}${item.points.toLocaleString()} pts`;
  }

  protected initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0]).join('').toUpperCase();
  }

  protected tone(customerId: string): string {
    const colors = ['#7857d9', '#d56f66', '#3f9d7c', '#c48736', '#487abf', '#995fa7'];
    const hash = [...customerId].reduce(
      (value, character) => ((value * 31) + character.charCodeAt(0)) | 0,
      7,
    ) >>> 0;
    return colors[hash % colors.length];
  }

  protected rewardProgress(redemptions: number): number {
    return redemptions * 100 / this.topRewardMaximum();
  }
}
