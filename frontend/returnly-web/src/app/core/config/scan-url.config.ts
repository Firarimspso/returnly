import { InjectionToken } from '@angular/core';

export const SCAN_BASE_URL = new InjectionToken<string>('SCAN_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://192.168.0.109:4200',
});
