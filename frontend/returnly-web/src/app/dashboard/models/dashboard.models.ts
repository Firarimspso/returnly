export type CustomerStatus = 'Active' | 'VIP' | 'New';

export interface CustomerTimelineItem {
  title: string;
  description: string;
  date: string;
  icon: string;
  type?: 'earn' | 'redeem' | 'qr' | 'adjustment';
}

export interface CustomerUpdate {
  name: string;
  phone: string;
  email: string;
  status: CustomerStatus;
}

export interface Customer {
  id: number;
  apiId?: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  memberSince?: string;
  points: number;
  lifetimePoints: number;
  visits: number;
  lastVisit: string;
  lastVisitTimestamp: number;
  favoriteReward: string;
  rewardsRedeemed: number;
  status: CustomerStatus;
  initials: string;
  color: string;
  activity: CustomerTimelineItem[];
}

export interface Reward {
  id: number;
  apiId?: string;
  name: string;
  description: string;
  points: number;
  active: boolean;
  icon: string;
  imageUrl?: string | null;
  redemptions: number;
  category: RewardCategory;
  createdAt: string;
  color: string;
}

export type RewardCategory = 'Food' | 'Drinks' | 'Discount' | 'Experience';

export interface RewardDraft {
  name: string;
  description: string;
  points: number;
  active: boolean;
  icon: string;
  category: RewardCategory;
  color: string;
}

export interface Activity {
  customer: string;
  initials: string;
  action: string;
  detail: string;
  time: string;
  tone: string;
}

export type CampaignType = 'Bonus Points' | 'Free Reward' | 'Discount' | 'Birthday Reward' | 'Seasonal Promotion';
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Completed';
export type CampaignAudience =
  | 'All customers'
  | 'Returning customers'
  | 'VIP customers'
  | 'All Customers'
  | 'VIP Members'
  | 'New Customers'
  | 'Inactive Customers'
  | 'Birthday Customers';

export interface Campaign {
  id: number;
  name: string;
  type: CampaignType;
  audience: CampaignAudience;
  status: CampaignStatus;
  message: string;
  incentiveValue: number;
  startDate: string;
  endDate: string;
  sent: number;
  opened: number;
  conversions: number;
  revenueInfluenced: number;
  createdAt: string;
}

export interface CampaignDraft {
  name: string;
  type: CampaignType;
  audience: CampaignAudience;
  status: CampaignStatus;
  message: string;
  incentiveValue: number;
  startDate: string;
  endDate: string;
}

export type QrCodeType = 'Table' | 'Receipt' | 'General';
export type QrCodeStatus = 'Active' | 'Inactive';

export interface QrCode {
  id: number;
  apiId?: string;
  name: string;
  type: QrCodeType;
  status: QrCodeStatus;
  totalScans: number;
  scansToday: number;
  conversions: number;
  lastScan: string;
  destination?: string;
  createdAt: string;
  token: string;
  pointsPerScan: number;
}

export interface QrCodeDraft {
  name: string;
  type: QrCodeType;
  status: QrCodeStatus;
  pointsPerScan: number;
}
