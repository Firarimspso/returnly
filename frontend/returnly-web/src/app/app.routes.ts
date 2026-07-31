import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'scan/:token',
    loadComponent: () => import('./scan/customer-scan').then((m) => m.CustomerScanPage),
    title: 'Scan & Earn — Returnly',
  },
  {
    path: 'my-rewards',
    loadComponent: () => import('./customer-login/customer-login').then((m) => m.CustomerLoginPage),
    title: 'View My Rewards — Returnly',
  },
  {
    path: 'rewards',
    loadComponent: () => import('./customer-portal/customer-rewards').then((m) => m.CustomerRewardsPage),
    title: 'My Rewards — Returnly',
  },
  {
    path: 'login',
    canMatch: [loginGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.LoginPage),
    title: 'Sign in | Returnly',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
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
