import { PointTransactionType } from './point-transaction.model';

export interface DashboardAnalyticsDto {
  restaurantName: string;
  totalCustomers: number;
  activeRewards: number;
  outstandingPoints: number;
  lifetimePointsIssued: number;
  rewardsRedeemed: number;
  activityTrend: DashboardActivityPointDto[];
  redemptionBreakdown: DashboardRedemptionDto[];
  recentActivity: DashboardRecentActivityDto[];
  topRewards: DashboardTopRewardDto[];
}

export interface DashboardActivityPointDto {
  date: string;
  count: number;
}

export interface DashboardRedemptionDto {
  name: string;
  count: number;
  percentage: number;
}

export interface DashboardRecentActivityDto {
  id: string;
  customerId: string;
  customerName: string;
  type: PointTransactionType;
  points: number;
  reason: string;
  createdAt: string;
}

export interface DashboardTopRewardDto {
  id: string;
  name: string;
  requiredPoints: number;
  icon: string | null;
  redemptions: number;
}

export interface DashboardAnalyticsApiResponse {
  data: DashboardAnalyticsDto;
  message: string | null;
}
