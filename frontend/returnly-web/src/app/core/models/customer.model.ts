export type ApiCustomerStatus = 'Active' | 'Vip' | 'New' | 'Inactive';

export interface CustomerDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  birthday: string | null;
  status: ApiCustomerStatus;
  currentPoints: number;
  lifetimePoints: number;
  totalVisits: number;
  lastVisitAt: string | null;
  favoriteReward: string | null;
  rewardsRedeemed: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface CustomerQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CustomerUpsertRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  birthday: string | null;
  status: ApiCustomerStatus;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string | null;
}
