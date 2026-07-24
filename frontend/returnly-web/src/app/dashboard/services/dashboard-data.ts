import { Injectable, signal } from '@angular/core';
import { Activity, Customer, CustomerUpdate, Reward, RewardDraft } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  readonly customers = signal<Customer[]>([
    {
      id: 1, name: 'Olivia Martin', phone: '+1 (503) 555-0148', email: 'olivia.martin@example.com', birthday: 'September 14, 1992',
      points: 1240, lifetimePoints: 4860, visits: 18, lastVisit: 'Today, 9:42 AM', lastVisitTimestamp: 202607230942,
      favoriteReward: 'Free Specialty Coffee', rewardsRedeemed: 7, status: 'VIP', initials: 'OM', color: '#7857d9',
      activity: [
        { title: 'Redeemed Free Specialty Coffee', description: 'Used 500 points · Order #4827', date: 'Today, 9:42 AM', icon: '◇' },
        { title: 'Earned 120 points', description: 'Dine-in visit · $48.00 spent', date: 'July 18, 2026', icon: '✦' },
        { title: 'Birthday reward unlocked', description: 'Complimentary dessert added', date: 'July 10, 2026', icon: '⌁' },
      ],
    },
    {
      id: 2, name: 'Jackson Lee', phone: '+1 (503) 555-0186', email: 'jackson.lee@example.com', birthday: 'February 3, 1988',
      points: 860, lifetimePoints: 3210, visits: 12, lastVisit: 'Today, 8:15 AM', lastVisitTimestamp: 202607230815,
      favoriteReward: '20% Off Your Order', rewardsRedeemed: 4, status: 'Active', initials: 'JL', color: '#d56f66',
      activity: [
        { title: 'Earned 85 points', description: 'Takeaway order · $34.00 spent', date: 'Today, 8:15 AM', icon: '✦' },
        { title: 'Redeemed 20% Off', description: 'Used 1,000 points · Order #4789', date: 'July 12, 2026', icon: '◇' },
        { title: 'Visited Solé & Maple', description: 'Lunch service', date: 'July 5, 2026', icon: '⌂' },
      ],
    },
    {
      id: 3, name: 'Sophia Brown', phone: '+1 (971) 555-0112', email: 'sophia.brown@example.com', birthday: 'June 27, 1997',
      points: 420, lifetimePoints: 620, visits: 3, lastVisit: 'Yesterday, 7:28 PM', lastVisitTimestamp: 202607221928,
      favoriteReward: 'Complimentary Dessert', rewardsRedeemed: 1, status: 'New', initials: 'SB', color: '#3f9d7c',
      activity: [
        { title: 'Earned 190 points', description: 'Dinner visit · $76.00 spent', date: 'Yesterday, 7:28 PM', icon: '✦' },
        { title: 'Joined the loyalty program', description: 'Signed up using restaurant QR', date: 'July 14, 2026', icon: '♙' },
      ],
    },
    {
      id: 4, name: 'Noah Wilson', phone: '+1 (503) 555-0169', email: 'noah.wilson@example.com', birthday: 'November 21, 1990',
      points: 210, lifetimePoints: 1780, visits: 8, lastVisit: 'Jul 20, 6:04 PM', lastVisitTimestamp: 202607201804,
      favoriteReward: 'Free Appetizer', rewardsRedeemed: 3, status: 'Active', initials: 'NW', color: '#c48736',
      activity: [
        { title: 'Earned 75 points', description: 'Dine-in visit · $30.00 spent', date: 'July 20, 2026', icon: '✦' },
        { title: 'Redeemed Free Appetizer', description: 'Used 650 points', date: 'June 29, 2026', icon: '◇' },
      ],
    },
    {
      id: 5, name: 'Emma Davis', phone: '+1 (971) 555-0174', email: 'emma.davis@example.com', birthday: 'April 8, 1985',
      points: 1560, lifetimePoints: 7450, visits: 29, lastVisit: 'Jul 19, 12:36 PM', lastVisitTimestamp: 202607191236,
      favoriteReward: 'Complimentary Dessert', rewardsRedeemed: 12, status: 'VIP', initials: 'ED', color: '#487abf',
      activity: [
        { title: 'Earned 145 points', description: 'Lunch visit · $58.00 spent', date: 'July 19, 2026', icon: '✦' },
        { title: 'VIP status renewed', description: 'Reached 25 annual visits', date: 'July 2, 2026', icon: '★' },
      ],
    },
    {
      id: 6, name: 'Liam Garcia', phone: '+1 (503) 555-0133', email: 'liam.garcia@example.com', birthday: 'December 16, 1994',
      points: 680, lifetimePoints: 2460, visits: 9, lastVisit: 'Jul 18, 8:51 PM', lastVisitTimestamp: 202607182051,
      favoriteReward: 'Free Specialty Coffee', rewardsRedeemed: 3, status: 'Active', initials: 'LG', color: '#995fa7',
      activity: [
        { title: 'Redeemed Free Specialty Coffee', description: 'Used 500 points', date: 'July 18, 2026', icon: '◇' },
        { title: 'Earned 210 points', description: 'Dinner visit · $84.00 spent', date: 'July 11, 2026', icon: '✦' },
      ],
    },
    {
      id: 7, name: 'Ava Thompson', phone: '+1 (503) 555-0195', email: 'ava.thompson@example.com', birthday: 'May 30, 1999',
      points: 185, lifetimePoints: 185, visits: 1, lastVisit: 'Jul 18, 1:14 PM', lastVisitTimestamp: 202607181314,
      favoriteReward: 'Free Specialty Coffee', rewardsRedeemed: 0, status: 'New', initials: 'AT', color: '#b85f77',
      activity: [{ title: 'Joined the loyalty program', description: 'First visit · $37.00 spent', date: 'July 18, 2026', icon: '♙' }],
    },
    {
      id: 8, name: 'Ethan Moore', phone: '+1 (971) 555-0125', email: 'ethan.moore@example.com', birthday: 'August 11, 1987',
      points: 2240, lifetimePoints: 9120, visits: 36, lastVisit: 'Jul 17, 7:40 PM', lastVisitTimestamp: 202607171940,
      favoriteReward: '20% Off Your Order', rewardsRedeemed: 16, status: 'VIP', initials: 'EM', color: '#4f8f86',
      activity: [{ title: 'Earned 260 points', description: 'Dinner visit · $104.00 spent', date: 'July 17, 2026', icon: '✦' }],
    },
    {
      id: 9, name: 'Mia Anderson', phone: '+1 (503) 555-0107', email: 'mia.anderson@example.com', birthday: 'January 19, 1996',
      points: 540, lifetimePoints: 1540, visits: 6, lastVisit: 'Jul 15, 10:08 AM', lastVisitTimestamp: 202607151008,
      favoriteReward: 'Complimentary Dessert', rewardsRedeemed: 2, status: 'Active', initials: 'MA', color: '#d07c4f',
      activity: [{ title: 'Earned 90 points', description: 'Brunch visit · $36.00 spent', date: 'July 15, 2026', icon: '✦' }],
    },
    {
      id: 10, name: 'Lucas Taylor', phone: '+1 (971) 555-0156', email: 'lucas.taylor@example.com', birthday: 'October 6, 1991',
      points: 330, lifetimePoints: 980, visits: 4, lastVisit: 'Jul 12, 5:22 PM', lastVisitTimestamp: 202607121722,
      favoriteReward: 'Free Appetizer', rewardsRedeemed: 1, status: 'Active', initials: 'LT', color: '#607db8',
      activity: [{ title: 'Earned 110 points', description: 'Early dinner · $44.00 spent', date: 'July 12, 2026', icon: '✦' }],
    },
    {
      id: 11, name: 'Isabella Clark', phone: '+1 (503) 555-0177', email: 'isabella.clark@example.com', birthday: 'March 24, 2000',
      points: 275, lifetimePoints: 275, visits: 2, lastVisit: 'Jul 10, 2:45 PM', lastVisitTimestamp: 202607101445,
      favoriteReward: 'Free Specialty Coffee', rewardsRedeemed: 0, status: 'New', initials: 'IC', color: '#a267a7',
      activity: [{ title: 'Second visit completed', description: 'Earned 95 points', date: 'July 10, 2026', icon: '✦' }],
    },
    {
      id: 12, name: 'Henry Martinez', phone: '+1 (971) 555-0181', email: 'henry.martinez@example.com', birthday: 'July 2, 1983',
      points: 980, lifetimePoints: 5680, visits: 21, lastVisit: 'Jul 8, 6:33 PM', lastVisitTimestamp: 202607081833,
      favoriteReward: '20% Off Your Order', rewardsRedeemed: 9, status: 'VIP', initials: 'HM', color: '#507e65',
      activity: [{ title: 'Redeemed 20% Off', description: 'Used 1,000 points · Order #4691', date: 'July 8, 2026', icon: '◇' }],
    },
  ]);

  readonly rewards = signal<Reward[]>([
    { id: 1, name: 'Free Specialty Coffee', description: 'Any hot or iced specialty drink', points: 500, active: true, icon: '☕', redemptions: 184, category: 'Drinks', createdAt: 'May 12, 2026', color: '#6952e8' },
    { id: 2, name: 'Complimentary Dessert', description: 'Choose any dessert from the menu', points: 750, active: true, icon: '✦', redemptions: 96, category: 'Food', createdAt: 'May 18, 2026', color: '#d06e79' },
    { id: 3, name: '20% Off Your Order', description: 'Valid on dine-in orders up to $100', points: 1000, active: true, icon: '%', redemptions: 72, category: 'Discount', createdAt: 'Jun 2, 2026', color: '#3b9470' },
    { id: 4, name: 'Free Appetizer', description: 'One appetizer with any main course', points: 650, active: false, icon: '♨', redemptions: 43, category: 'Food', createdAt: 'Jun 8, 2026', color: '#d58a43' },
    { id: 5, name: 'Chef’s Tasting Experience', description: 'A curated tasting menu for two guests', points: 3000, active: true, icon: '★', redemptions: 18, category: 'Experience', createdAt: 'Jun 21, 2026', color: '#4f7fbd' },
    { id: 6, name: 'Free Fresh Juice', description: 'Any house-made seasonal juice', points: 400, active: false, icon: '◉', redemptions: 61, category: 'Drinks', createdAt: 'Jul 3, 2026', color: '#9c63a7' },
  ]);

  readonly activities: Activity[] = [
    { customer: 'Olivia Martin', initials: 'OM', action: 'Redeemed a reward', detail: 'Free Specialty Coffee', time: '2 min ago', tone: '#7857d9' },
    { customer: 'Jackson Lee', initials: 'JL', action: 'Earned 120 points', detail: 'Order #4821', time: '18 min ago', tone: '#d56f66' },
    { customer: 'Sophia Brown', initials: 'SB', action: 'Joined your program', detail: 'New customer', time: '42 min ago', tone: '#3f9d7c' },
    { customer: 'Emma Davis', initials: 'ED', action: 'Visited your restaurant', detail: 'Visit #23', time: '1 hr ago', tone: '#487abf' },
  ];

  removeReward(id: number): void {
    this.rewards.update((items) => items.filter((reward) => reward.id !== id));
  }

  addReward(draft: RewardDraft): void {
    const nextId = Math.max(0, ...this.rewards().map((reward) => reward.id)) + 1;
    this.rewards.update((rewards) => [
      {
        ...draft,
        id: nextId,
        redemptions: 0,
        createdAt: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()),
      },
      ...rewards,
    ]);
  }

  updateReward(rewardId: number, draft: RewardDraft): void {
    this.rewards.update((rewards) =>
      rewards.map((reward) => reward.id === rewardId ? { ...reward, ...draft } : reward),
    );
  }

  setRewardActive(rewardId: number, active: boolean): void {
    this.rewards.update((rewards) =>
      rewards.map((reward) => reward.id === rewardId ? { ...reward, active } : reward),
    );
  }

  addCustomerPoints(customerId: number, points: number, note: string): void {
    const amount = Math.max(1, Math.round(points));
    this.updateCustomerRecord(customerId, (customer) => ({
      ...customer,
      points: customer.points + amount,
      lifetimePoints: customer.lifetimePoints + amount,
      activity: [
        {
          title: `Added ${amount.toLocaleString()} points`,
          description: note.trim() || 'Manual adjustment by restaurant',
          date: this.activityDate(),
          icon: '✦',
        },
        ...customer.activity,
      ],
    }));
  }

  redeemCustomerReward(customerId: number, rewardId: number): boolean {
    const reward = this.rewards().find((item) => item.id === rewardId && item.active);
    const customer = this.customers().find((item) => item.id === customerId);
    if (!reward || !customer || customer.points < reward.points) return false;

    this.updateCustomerRecord(customerId, (current) => ({
      ...current,
      points: current.points - reward.points,
      rewardsRedeemed: current.rewardsRedeemed + 1,
      favoriteReward: reward.name,
      activity: [
        {
          title: `Redeemed ${reward.name}`,
          description: `Used ${reward.points.toLocaleString()} points · Staff redemption`,
          date: this.activityDate(),
          icon: '◇',
        },
        ...current.activity,
      ],
    }));
    return true;
  }

  updateCustomerProfile(customerId: number, update: CustomerUpdate): void {
    const initials = update.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

    this.updateCustomerRecord(customerId, (customer) => ({
      ...customer,
      ...update,
      initials: initials || customer.initials,
      activity: [
        {
          title: 'Customer profile updated',
          description: 'Contact or profile information was changed',
          date: this.activityDate(),
          icon: '✎',
        },
        ...customer.activity,
      ],
    }));
  }

  private updateCustomerRecord(customerId: number, updater: (customer: Customer) => Customer): void {
    this.customers.update((customers) =>
      customers.map((customer) => customer.id === customerId ? updater(customer) : customer),
    );
  }

  private activityDate(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
  }
}
