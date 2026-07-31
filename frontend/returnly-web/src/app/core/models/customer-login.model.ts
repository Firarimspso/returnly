import { CustomerVerificationChallengeDto } from './customer-auth.model';

export type CustomerLoginStatus = 'Authenticated' | 'SelectRestaurant' | 'NoAccount';

export interface CustomerRestaurantOptionDto {
  customerKey: string;
  restaurantName: string;
  restaurantLogoUrl: string | null;
  primaryBrandColor: string;
  currentPoints: number;
}

export interface CustomerLoginResultDto {
  status: CustomerLoginStatus;
  customerPortalToken: string | null;
  customerPortalTokenExpiresAt: string | null;
  selectionToken: string | null;
  selectionExpiresAt: string | null;
  restaurants: CustomerRestaurantOptionDto[];
}

export interface CustomerLoginApiResponse<T> {
  data: T;
  message: string | null;
}

export type CustomerLoginChallengeDto = CustomerVerificationChallengeDto;
