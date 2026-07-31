import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/overview/overview').then((m) => m.OverviewPage), title: 'Dashboard | Returnly' },
      { path: 'customers', loadComponent: () => import('./pages/customers/customers').then((m) => m.CustomersPage), title: 'Customers | Returnly' },
      { path: 'rewards', loadComponent: () => import('./pages/rewards/rewards').then((m) => m.RewardsPage), title: 'Rewards | Returnly' },
      { path: 'redemptions', loadComponent: () => import('./pages/redemptions/redemptions').then((m) => m.RedemptionsPage), title: 'Redemptions | Returnly' },
      { path: 'qr-codes', loadComponent: () => import('./pages/qr-codes/qr-codes').then((m) => m.QrCodesPage), title: 'QR Codes | Returnly' },
      { path: 'campaigns', loadComponent: () => import('./pages/campaigns/campaigns').then((m) => m.CampaignsPage), title: 'Campaigns | Returnly' },
      { path: 'analytics', loadComponent: () => import('./pages/analytics/analytics').then((m) => m.AnalyticsPage), title: 'Analytics | Returnly' },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage), title: 'Settings | Returnly' },
      { path: 'restaurant-profile', loadComponent: () => import('./pages/restaurant-profile/restaurant-profile').then((m) => m.RestaurantProfilePage), title: 'Restaurant Profile | Returnly' },
      { path: '**', redirectTo: '' },
    ],
  },
];
