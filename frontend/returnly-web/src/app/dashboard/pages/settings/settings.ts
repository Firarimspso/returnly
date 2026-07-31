import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../components/page-header/page-header';

type SettingsSection =
  | 'general'
  | 'notifications'
  | 'security'
  | 'team'
  | 'preferences'
  | 'danger-zone';

interface ApplicationSettings {
  timeZone: string;
  language: string;
  currency: string;
  notifications: {
    rewardRedeemed: boolean;
    weeklyAnalytics: boolean;
    productUpdates: boolean;
    systemMaintenance: boolean;
  };
  density: 'comfortable' | 'compact';
  analyticsPeriod: 'today' | 'last-7-days' | 'last-30-days' | 'all-time';
  landingPage: 'dashboard' | 'analytics' | 'customers' | 'rewards';
}

const SETTINGS_KEY = 'returnly_application_settings';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss', './settings-panels.scss'],
})
export class SettingsPage {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private saveTimer?: ReturnType<typeof setTimeout>;
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly user = this.auth.user;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly showToast = signal(false);
  protected readonly deleteConfirmationOpen = signal(false);
  protected readonly activeSection = signal<SettingsSection>('general');
  protected readonly settings = signal<ApplicationSettings>(this.defaultSettings());
  protected readonly ownerName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}`.trim() : 'Restaurant owner';
  });
  protected readonly ownerInitials = computed(() =>
    this.ownerName().split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0]).join('').toUpperCase());
  protected readonly sessionStarted = computed(() => this.readSessionStarted());

  protected readonly navigation: ReadonlyArray<{ id: SettingsSection; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'team', label: 'Team' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'danger-zone', label: 'Danger Zone' },
  ];

  constructor() {
    this.loadSettings();
    this.destroyRef.onDestroy(() => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      if (this.toastTimer) clearTimeout(this.toastTimer);
    });
  }

  protected patch<K extends keyof ApplicationSettings>(
    key: K,
    value: ApplicationSettings[K],
  ): void {
    this.settings.update((settings) => ({ ...settings, [key]: value }));
    this.saved.set(false);
  }

  protected updateNotification(
    key: keyof ApplicationSettings['notifications'],
    enabled: boolean,
  ): void {
    this.settings.update((settings) => ({
      ...settings,
      notifications: { ...settings.notifications, [key]: enabled },
    }));
    this.saved.set(false);
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings()));

    this.saveTimer = setTimeout(() => {
      this.saving.set(false);
      this.saved.set(true);
      this.showToast.set(true);
      this.toastTimer = setTimeout(() => this.showToast.set(false), 3200);
    }, 350);
  }

  protected scrollTo(section: SettingsSection): void {
    this.activeSection.set(section);
    globalThis.document?.getElementById(section)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  protected openDeleteConfirmation(): void {
    this.deleteConfirmationOpen.set(true);
  }

  protected closeDeleteConfirmation(): void {
    this.deleteConfirmationOpen.set(false);
  }

  private loadSettings(): void {
    try {
      const stored = globalThis.localStorage?.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ApplicationSettings>;
        const defaults = this.defaultSettings();
        this.settings.set({
          ...defaults,
          ...parsed,
          notifications: { ...defaults.notifications, ...parsed.notifications },
        });
      }
    } catch {
      globalThis.localStorage?.removeItem(SETTINGS_KEY);
    }
    queueMicrotask(() => this.loading.set(false));
  }

  private defaultSettings(): ApplicationSettings {
    return {
      timeZone: 'Asia/Beirut',
      language: 'en',
      currency: 'LBP',
      notifications: {
        rewardRedeemed: true,
        weeklyAnalytics: true,
        productUpdates: false,
        systemMaintenance: true,
      },
      density: 'comfortable',
      analyticsPeriod: 'last-30-days',
      landingPage: 'dashboard',
    };
  }

  private readSessionStarted(): string {
    try {
      const token = globalThis.localStorage?.getItem('returnly_token')
        ?? globalThis.sessionStorage?.getItem('returnly_token');
      const payload = token?.split('.')[1];
      if (!payload) return 'Current session';
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(globalThis.atob(
        normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='),
      )) as { iat?: unknown };
      if (typeof decoded.iat !== 'number') return 'Current session';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(decoded.iat * 1000));
    } catch {
      return 'Current session';
    }
  }
}
