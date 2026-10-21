import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/** The centred icon and message a data widget shows instead of its content, with optional Retry. */
@Component({
  selector: 'app-widget-status',
  imports: [ButtonModule],
  template: `
    <i class="pi" [class]="icon()" aria-hidden="true"></i>
    <span><ng-content /></span>
    @if (retryable()) {
      <p-button label="Retry" icon="pi pi-refresh" size="small" text (onClick)="retry.emit()" />
    }
  `,
  styleUrl: './widget-status.component.scss',
  host: {
    '[class.error]': "tone() === 'error'",
    '[attr.role]': "tone() === 'error' ? 'alert' : 'status'",
  },
})
export class WidgetStatusComponent {
  /** The PrimeIcons class above the message, e.g. `pi-database`. */
  public readonly icon = input('pi-info-circle');
  public readonly tone = input<'neutral' | 'error'>('neutral');
  public readonly retryable = input(false);

  public readonly retry = output<void>();
}
