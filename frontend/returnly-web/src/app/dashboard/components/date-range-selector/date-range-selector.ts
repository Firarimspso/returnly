import { Component, HostListener, output, signal } from '@angular/core';

export type DateRangeKey =
  | 'today'
  | 'last-7-days'
  | 'last-30-days'
  | 'all-time';

export interface DateRangeOption {
  key: DateRangeKey;
  label: string;
}

@Component({
  selector: 'app-date-range-selector',
  templateUrl: './date-range-selector.html',
  styleUrl: './date-range-selector.scss',
})
export class DateRangeSelectorComponent {
  readonly changed = output<DateRangeOption>();

  protected readonly open = signal(false);
  protected readonly selected = signal<DateRangeOption>({
    key: 'last-30-days',
    label: 'Last 30 Days',
  });
  protected readonly options: DateRangeOption[] = [
    { key: 'today', label: 'Today' },
    { key: 'last-7-days', label: 'Last 7 Days' },
    { key: 'last-30-days', label: 'Last 30 Days' },
    { key: 'all-time', label: 'All Time' },
  ];

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((open) => !open);
  }

  protected select(option: DateRangeOption, event: Event): void {
    event.stopPropagation();
    this.selected.set(option);
    this.open.set(false);
    this.changed.emit(option);

  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected close(): void {
    this.open.set(false);
  }
}
