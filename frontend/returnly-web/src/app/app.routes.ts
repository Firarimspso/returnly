import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'scan/:token',
    loadComponent: () => import('./scan/customer-scan').then((m) => m.CustomerScanPage),
    title: 'Scan & Earn — Returnly',
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./landing/landing').then((m) => m.LandingComponent),
    title: 'Returnly — Restaurant Loyalty Made Simple',
  },
  { path: '**', redirectTo: '' },
];
