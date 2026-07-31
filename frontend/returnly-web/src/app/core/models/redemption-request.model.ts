export type RedemptionRequestStatus = 'Pending' | 'Confirmed' | 'Expired' | 'Cancelled';

export interface AdminRedemptionRequestDto {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  rewardId: string;
  rewardName: string;
  requiredPoints: number;
  confirmationCode: string;
  status: RedemptionRequestStatus;
  requestedAt: string;
  expiresAt: string;
  confirmedAt: string | null;
}

export interface ConfirmedRedemptionDto {
  id: string;
  customerId: string;
  customerName: string;
  rewardId: string;
  rewardName: string;
  pointsDeducted: number;
  currentPoints: number;
  confirmedAt: string;
}

export interface RedemptionRequestQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RedemptionRequestStatus;
}

export interface RedemptionApiResponse<T> {
  data: T;
  message: string | null;
}

export interface RedemptionPagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
