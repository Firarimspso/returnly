import { QrCodeApiResponse } from './qr-code.model';

export type CustomerVerificationChannel = 'Email' | 'Phone';

export interface RequestCustomerVerificationCode {
  qrToken: string;
  channel: CustomerVerificationChannel;
  identifier: string;
}

export interface CustomerVerificationChallengeDto {
  challengeId: string;
  message: string;
  maskedDestination: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface VerifyCustomerCodeRequest {
  challengeId: string;
  verificationCode: string;
}

export interface VerifiedCustomerSummaryDto {
  id: string;
  firstName: string;
  maskedIdentifier: string;
}

export interface CustomerVerificationResultDto {
  customerPortalToken: string;
  customerPortalTokenExpiresAt: string;
  customer: VerifiedCustomerSummaryDto;
  restaurantName: string;
  restaurantLogoUrl: string | null;
  primaryBrandColor: string;
  pointsAwarded: number;
  currentPoints: number;
  scannedAt: string;
}

export type CustomerAuthApiResponse<T> = QrCodeApiResponse<T>;
