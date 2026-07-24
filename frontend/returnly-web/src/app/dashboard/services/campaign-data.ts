import { Injectable, signal } from '@angular/core';
import { Campaign, CampaignDraft, CampaignStatus } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class CampaignDataService {
  readonly campaigns = signal<Campaign[]>([
    { id: 1, name: 'Weekend Double Points', type: 'Bonus Points', audience: 'All Customers', status: 'Active', message: 'Earn double points on every visit this weekend.', incentiveValue: 2, startDate: '2026-07-18', endDate: '2026-07-26', sent: 2847, opened: 2138, conversions: 524, revenueInfluenced: 18420, createdAt: 'Jul 12, 2026' },
    { id: 2, name: 'We Miss You', type: 'Free Reward', audience: 'Inactive Customers', status: 'Active', message: 'Come back this week and enjoy a complimentary coffee.', incentiveValue: 500, startDate: '2026-07-15', endDate: '2026-07-31', sent: 342, opened: 261, conversions: 86, revenueInfluenced: 3940, createdAt: 'Jul 10, 2026' },
    { id: 3, name: 'Summer Menu Launch', type: 'Seasonal Promotion', audience: 'VIP Members', status: 'Scheduled', message: 'Be the first to experience our new summer menu.', incentiveValue: 15, startDate: '2026-08-01', endDate: '2026-08-14', sent: 0, opened: 0, conversions: 0, revenueInfluenced: 0, createdAt: 'Jul 20, 2026' },
    { id: 4, name: 'July Birthday Treat', type: 'Birthday Reward', audience: 'Birthday Customers', status: 'Active', message: 'Celebrate your birthday with a dessert on us.', incentiveValue: 750, startDate: '2026-07-01', endDate: '2026-07-31', sent: 128, opened: 112, conversions: 69, revenueInfluenced: 2860, createdAt: 'Jun 25, 2026' },
    { id: 5, name: 'Tuesday Table Offer', type: 'Discount', audience: 'All Customers', status: 'Paused', message: 'Enjoy 20% off dine-in orders every Tuesday.', incentiveValue: 20, startDate: '2026-06-10', endDate: '2026-08-31', sent: 1850, opened: 1221, conversions: 318, revenueInfluenced: 9760, createdAt: 'Jun 4, 2026' },
    { id: 6, name: 'New Member Welcome', type: 'Bonus Points', audience: 'New Customers', status: 'Completed', message: 'Start your loyalty journey with 200 bonus points.', incentiveValue: 200, startDate: '2026-05-01', endDate: '2026-06-30', sent: 604, opened: 531, conversions: 427, revenueInfluenced: 12680, createdAt: 'Apr 27, 2026' },
    { id: 7, name: 'Autumn Preview', type: 'Seasonal Promotion', audience: 'VIP Members', status: 'Draft', message: 'A first look at the flavors arriving this autumn.', incentiveValue: 10, startDate: '2026-09-05', endDate: '2026-09-20', sent: 0, opened: 0, conversions: 0, revenueInfluenced: 0, createdAt: 'Jul 22, 2026' },
  ]);

  createCampaign(draft: CampaignDraft): Campaign {
    const id = Math.max(0, ...this.campaigns().map((campaign) => campaign.id)) + 1;
    const campaign: Campaign = {
      ...draft, id, sent: 0, opened: 0, conversions: 0, revenueInfluenced: 0,
      createdAt: this.formattedDate(),
    };
    this.campaigns.update((items) => [campaign, ...items]);
    return campaign;
  }

  updateCampaign(id: number, draft: CampaignDraft): void {
    this.campaigns.update((items) => items.map((campaign) => campaign.id === id ? { ...campaign, ...draft } : campaign));
  }

  deleteCampaign(id: number): void {
    this.campaigns.update((items) => items.filter((campaign) => campaign.id !== id));
  }

  setStatus(id: number, status: CampaignStatus): void {
    this.campaigns.update((items) => items.map((campaign) => campaign.id === id ? { ...campaign, status } : campaign));
  }

  private formattedDate(): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  }
}
