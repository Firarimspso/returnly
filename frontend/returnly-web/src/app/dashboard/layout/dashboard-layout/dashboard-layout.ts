import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RestaurantProfileApiService } from '../../../core/services/restaurant-profile-api.service';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileApi = inject(RestaurantProfileApiService);

  protected readonly user = this.auth.user;
  protected readonly restaurantProfile = this.profileApi.profile;
  protected readonly restaurantName = computed(() =>
    this.restaurantProfile()?.name?.trim() || this.user()?.restaurantName?.trim() || 'Restaurant workspace');
  protected readonly restaurantInitials = computed(() =>
    this.initials(this.restaurantName()));
  protected readonly restaurantLocation = computed(() =>
    this.restaurantProfile()?.address?.trim() || 'Location not configured');
  protected readonly userName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}`.trim() : 'Restaurant admin';
  });
  protected readonly userInitials = computed(() => this.initials(this.userName()));
  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly profileOpen = signal(false);

  protected readonly navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '⌂', exact: true },
    { label: 'Customers', path: '/dashboard/customers', icon: '♙' },
    { label: 'Rewards', path: '/dashboard/rewards', icon: '◇' },
    { label: 'Redemptions', path: '/dashboard/redemptions', icon: '✓' },
    { label: 'QR Codes', path: '/dashboard/qr-codes', icon: '⌗' },
    { label: 'Campaigns', path: '/dashboard/campaigns', icon: '↗' },
    { label: 'Analytics', path: '/dashboard/analytics', icon: '⌁' },
    { label: 'Restaurant Profile', path: '/dashboard/restaurant-profile', icon: '◉' },
  ];

  constructor() {
    this.profileApi.getProfile().subscribe({ error: () => undefined });
  }

  protected toggleSidebar(): void {
    if (window.innerWidth <= 900) this.mobileOpen.update((open) => !open);
    else this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }

  protected toggleProfile(event: Event): void {
    event.stopPropagation();
    this.profileOpen.update((open) => !open);
  }

  protected logout(): void {
    this.auth.logout();
    this.profileOpen.set(false);
    void this.router.navigate(['/login']);
  }

  @HostListener('document:click')
  protected closeProfile(): void {
    this.profileOpen.set(false);
  }

  private initials(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'R';
  }
}
