import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/page-header/page-header';

@Component({ selector: 'app-settings-page', imports: [FormsModule, PageHeaderComponent], templateUrl: './settings.html', styleUrl: './settings.scss' })
export class SettingsPage {
  protected readonly accent = signal('#6952e8');
  protected readonly compact = signal(false);
  protected readonly days = [
    { name: 'Monday', open: true, from: '09:00', to: '22:00' }, { name: 'Tuesday', open: true, from: '09:00', to: '22:00' },
    { name: 'Wednesday', open: true, from: '09:00', to: '22:00' }, { name: 'Thursday', open: true, from: '09:00', to: '22:00' },
    { name: 'Friday', open: true, from: '09:00', to: '23:00' }, { name: 'Saturday', open: true, from: '10:00', to: '23:00' },
    { name: 'Sunday', open: false, from: '10:00', to: '20:00' },
  ];
}
