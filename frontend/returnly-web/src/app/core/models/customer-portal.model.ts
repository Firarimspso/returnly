import { PointTransactionType } from './point-transaction.model';

export type RedemptionStatus = 'Pending' | 'Confirmed' | 'Expired' | 'Cancelled';

export interface CustomerPortalDto {
  restaurantName: string;
  restaurantLogoUrl: string | null;
  restaurantCoverImageUrl: string | null;
  restaurantDescription: string | null;
  primaryBrandColor: string;
  customerFirstName: string;
  currentPoints: number;
  rewards: CustomerPortalRewardDto[];
  recentTransactions: CustomerPortalTransactionDto[];
  previousRedemptions: CustomerPortalRedemptionDto[];
}

export interface CustomerPortalRewardDto {
  id: string;
  name: string;
  description: string;
  requiredPoints: number;
  icon: string | null;
  color: string | null;
  isUnlocked: boolean;
  pointsRemaining: number;
  progressPercentage: number;
}

export interface CustomerPortalTransactionDto {
  id: string;
  type: PointTransactionType;
  points: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface CustomerPortalRedemptionDto {
  id: string;
  rewardName: string;
  points: number;
  status: RedemptionStatus;
  requestedAt: string;
  confirmedAt: string | null;
}

export interface RedemptionRequestDto {
  id: string;
  rewardId: string;
  rewardName: string;
  requiredPoints: number;
  confirmationCode: string;
  status: RedemptionStatus;
  expiresAt: string;
}

export interface CustomerPortalApiResponse<T> {
  data: T;
  message: string | null;
}
