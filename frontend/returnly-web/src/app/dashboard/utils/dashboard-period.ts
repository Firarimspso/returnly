import { DashboardAnalyticsPeriod } from '../../core/services/dashboard-analytics-api.service';
import {
  DateRangeKey,
  DateRangeOption,
} from '../components/date-range-selector/date-range-selector';

export const DEFAULT_DASHBOARD_RANGE: DateRangeOption = {
  key: 'last-30-days',
  label: 'Last 30 Days',
};

const analyticsPeriods: Record<DateRangeKey, DashboardAnalyticsPeriod> = {
  today: 'Today',
  'last-7-days': 'Last7Days',
  'last-30-days': 'Last30Days',
  'all-time': 'AllTime',
};

export function toDashboardAnalyticsPeriod(range: DateRangeKey): DashboardAnalyticsPeriod {
  return analyticsPeriods[range];
}
