import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss',
})
export class ConfirmationDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly closed = output<void>();
  readonly confirmed = output<void>();

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void { this.closed.emit(); }
}
