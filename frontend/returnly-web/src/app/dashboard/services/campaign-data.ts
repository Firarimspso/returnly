import { Injectable, signal } from '@angular/core';
import { Campaign, CampaignDraft, CampaignStatus } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class CampaignDataService {
  readonly campaigns = signal<Campaign[]>([]);

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
