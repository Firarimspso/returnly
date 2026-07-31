import {
  Component,
  HostListener,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-time-picker',
  imports: [FormsModule],
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.scss',
})
export class TimePickerComponent {
  readonly value = input.required<string>();
  readonly disabled = input(false);
  readonly ariaLabel = input('Select time');
  readonly valueChange = output<string>();

  protected readonly open = signal(false);
  protected readonly draft = signal('');
  protected readonly selectedHour = signal('09');
  protected readonly selectedMinute = signal('00');
  protected readonly hours = Array.from({ length: 24 }, (_, value) =>
    String(value).padStart(2, '0'));
  protected readonly minutes = Array.from({ length: 60 }, (_, value) =>
    String(value).padStart(2, '0'));

  constructor() {
    effect(() => {
      const value = this.value();
      this.draft.set(value);
      if (/^\d{2}:\d{2}$/.test(value)) {
        const [hour, minute] = value.split(':');
        this.selectedHour.set(hour);
        this.selectedMinute.set(minute);
      }
    });
  }

  protected show(event: Event): void {
    event.stopPropagation();
    if (!this.disabled()) this.open.set(true);
  }

  protected updateDraft(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^\d:]/g, '').slice(0, 5);
    this.draft.set(cleaned);
    this.valueChange.emit(cleaned);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(cleaned)) {
      const [hour, minute] = cleaned.split(':');
      this.selectedHour.set(hour);
      this.selectedMinute.set(minute);
    }
  }

  protected selectPart(part: 'hour' | 'minute', value: string): void {
    if (part === 'hour') this.selectedHour.set(value);
    else this.selectedMinute.set(value);
    const selected = `${this.selectedHour()}:${this.selectedMinute()}`;
    this.draft.set(selected);
    this.valueChange.emit(selected);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.open.set(false);
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  @HostListener('document:click')
  protected closeFromOutside(): void {
    this.open.set(false);
  }
}
