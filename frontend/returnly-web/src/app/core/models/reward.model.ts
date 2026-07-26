export type ApiRewardCategory = 'Food' | 'Drinks' | 'Discount' | 'Experience';

export interface RewardDto {
  id: string;
  name: string;
  description: string;
  requiredPoints: number;
  isActive: boolean;
  category: ApiRewardCategory;
  icon: string | null;
  color: string | null;
  totalRedemptions: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface RewardQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  category?: ApiRewardCategory;
}

export interface RewardUpsertRequest {
  name: string;
  description: string;
  requiredPoints: number;
  isActive: boolean;
  category: ApiRewardCategory;
  icon: string | null;
  color: string | null;
}

export interface RewardApiResponse<T> {
  data: T;
  message: string | null;
}

export interface RewardPagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
