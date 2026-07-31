export interface RestaurantProfileDto {
  id: string;
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  address: string | null;
  businessHours: string;
  instagram: string | null;
  facebook: string | null;
  primaryBrandColor: string;
  updatedAt: string | null;
}

export type UpdateRestaurantProfileRequest = Omit<RestaurantProfileDto, 'id' | 'updatedAt'>;
export interface RestaurantProfileApiResponse<T> { data: T; message: string | null; }

export interface BusinessDay {
  open: string;
  close: string;
  closed: boolean;
}
