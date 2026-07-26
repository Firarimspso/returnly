export type PointTransactionType = 'Earn' | 'Redeem';

export interface PointTransactionDto {
  id: string;
  customerId: string;
  customerName: string;
  points: number;
  type: PointTransactionType;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface PointTransactionQuery {
  page?: number;
  pageSize?: number;
  customerId?: string;
  type?: PointTransactionType;
  search?: string;
}

export interface CreatePointTransactionRequest {
  customerId: string;
  points: number;
  reason: string;
}

export interface PointTransactionApiResponse<T> {
  data: T;
  message: string | null;
}

export interface PointTransactionPagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
