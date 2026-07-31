export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  restaurantName: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

export interface AuthApiResponse<T> {
  data: T;
  message: string | null;
}
