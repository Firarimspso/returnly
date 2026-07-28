export type ApiQrCodeType = 'General' | 'Table' | 'Receipt';

export interface QrCodeDto {
  id: string;
  name: string;
  type: ApiQrCodeType;
  token: string;
  pointsPerScan: number;
  isActive: boolean;
  totalScans: number;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface QrCodeQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  type?: ApiQrCodeType;
}

export interface CreateQrCodeRequest {
  name: string;
  type: ApiQrCodeType;
  pointsPerScan: number;
  isActive: boolean;
}

export interface SetQrCodeStatusRequest {
  isActive: boolean;
}

export interface ScanQrCodeRequest {
  token: string;
  customerId: string;
}

export interface QrCodeScanResultDto {
  qrCode: QrCodeDto;
  customerId: string;
  customerName: string;
  pointsAwarded: number;
  currentPoints: number;
  pointTransactionId: string;
  scannedAt: string;
}

export interface PublicQrCodeDto {
  restaurantName: string;
  qrCodeName: string;
  type: ApiQrCodeType;
  pointsPerScan: number;
  expiresAt: string | null;
}

export interface PublicQrScanRequest {
  identifier: string;
}

export interface PublicQrScanResultDto {
  restaurantName: string;
  customerFirstName: string;
  pointsAwarded: number;
  currentPoints: number;
  scannedAt: string;
}

export interface QrCodeApiResponse<T> {
  data: T;
  message: string | null;
}

export interface QrCodePagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
