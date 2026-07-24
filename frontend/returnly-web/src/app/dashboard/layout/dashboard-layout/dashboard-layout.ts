import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayoutComponent {
  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly profileOpen = signal(false);

  protected readonly navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '⌂', exact: true },
    { label: 'Customers', path: '/dashboard/customers', icon: '♙' },
    { label: 'Rewards', path: '/dashboard/rewards', icon: '◇' },
    { label: 'QR Codes', path: '/dashboard/qr-codes', icon: '⌗' },
    { label: 'Campaigns', path: '/dashboard/campaigns', icon: '↗' },
    { label: 'Analytics', path: '/dashboard/analytics', icon: '⌁' },
  ];

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

  @HostListener('document:click')
  protected closeProfile(): void {
    this.profileOpen.set(false);
  }
}
