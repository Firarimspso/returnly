import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import {
  DashboardAnalyticsDto,
  DashboardAnalyticsApiResponse,
} from '../../../core/models/dashboard-analytics.model';
import {
  DashboardAnalyticsApiService,
  DashboardAnalyticsPeriod,
} from '../../../core/services/dashboard-analytics-api.service';
import { DateRangeSelectorComponent } from '../../components/date-range-selector/date-range-selector';
import { AnalyticsPage } from './analytics';

class AnalyticsApiStub {
  readonly requestedPeriods: DashboardAnalyticsPeriod[] = [];

  getAnalytics(period: DashboardAnalyticsPeriod): Observable<DashboardAnalyticsApiResponse> {
    this.requestedPeriods.push(period);
    return of({
      data: analyticsData(period === 'Today' ? 1 : 30),
      message: null,
    });
  }
}

function analyticsData(multiplier: number): DashboardAnalyticsDto {
  return {
    restaurantName: 'Returnly Test Kitchen',
    totalCustomers: 10 * multiplier,
    activeRewards: multiplier,
    outstandingPoints: 100 * multiplier,
    lifetimePointsIssued: 200 * multiplier,
    rewardsRedeemed: 3 * multiplier,
    activityTrend: [{ date: '2026-07-29', count: 2 * multiplier }],
    redemptionBreakdown: [{ name: 'Free Coffee', count: multiplier, percentage: 100 }],
    recentActivity: [{
      id: `activity-${multiplier}`,
      customerId: 'customer-1',
      customerName: 'Maya Haddad',
      type: 'Earn',
      points: 25 * multiplier,
      reason: 'QR scan',
      createdAt: '2026-07-29T10:00:00Z',
    }],
    topRewards: [{
      id: 'reward-1',
      name: 'Free Coffee',
      requiredPoints: 75,
      icon: 'coffee',
      redemptions: multiplier,
    }],
  };
}

describe('AnalyticsPage date range', () => {
  let fixture: ComponentFixture<AnalyticsPage>;
  let api: AnalyticsApiStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsPage],
      providers: [{ provide: DashboardAnalyticsApiService, useClass: AnalyticsApiStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsPage);
    api = TestBed.inject(DashboardAnalyticsApiService) as unknown as AnalyticsApiStub;
    fixture.detectChanges();
  });

  it('reloads the complete analytics DTO when the shared selector emits a period', () => {
    expect(api.requestedPeriods).toEqual(['Last30Days']);

    const selector = fixture.debugElement
      .query(By.directive(DateRangeSelectorComponent))
      .componentInstance as DateRangeSelectorComponent;
    selector.changed.emit({ key: 'today', label: 'Today' });
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as {
      analytics: () => DashboardAnalyticsDto | null;
      selectedRange: () => { label: string };
      topRewards: () => Array<{ redemptions: number }>;
    };

    expect(api.requestedPeriods).toEqual(['Last30Days', 'Today']);
    expect(page.selectedRange().label).toBe('Today');
    expect(page.analytics()?.totalCustomers).toBe(10);
    expect(page.analytics()?.activityTrend[0].count).toBe(2);
    expect(page.analytics()?.recentActivity[0].id).toBe('activity-1');
    expect(page.topRewards()[0].redemptions).toBe(1);
  });
});
