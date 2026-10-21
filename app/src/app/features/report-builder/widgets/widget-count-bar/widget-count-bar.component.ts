import { Component, computed, input, output } from '@angular/core';

/**
 * The footer strip saying how many rows a data widget shows, so a filtered or capped widget never
 * looks like the whole dataset. Hover lists the {@link filters}; when {@link actionable} it's a
 * button.
 */
@Component({
  selector: 'app-widget-count-bar',
  template: `
    @if (actionable()) {
      <button type="button" class="content" [title]="tooltip()" (click)="activate.emit()">
        <i class="pi" [class]="icon()" aria-hidden="true"></i>
        {{ label() }}
        <i class="pi pi-angle-right chevron" aria-hidden="true"></i>
      </button>
    } @else {
      <span class="content" [title]="tooltip()">
        <i class="pi" [class]="icon()" aria-hidden="true"></i>
        {{ label() }}
      </span>
    }
  `,
  styleUrl: './widget-count-bar.component.scss',
  host: {
    '[class.warning]': 'warning()',
  },
})
export class WidgetCountBarComponent {
  public readonly label = input.required<string>();
  /** The PrimeIcons class beside the label, e.g. `pi-filter`. */
  public readonly icon = input('pi-list');
  /** Showing less than everything: a row cap, or a series that failed to load. */
  public readonly warning = input(false);
  public readonly filters = input<readonly string[]>([]);
  public readonly actionable = input(false);

  public readonly activate = output<void>();

  public readonly tooltip = computed(() => {
    const filters = this.filters();
    const lines = filters.length > 0 ? ['Filtered by:', ...filters.map((f) => `• ${f}`)] : [];
    if (this.actionable()) lines.push(...(lines.length > 0 ? [''] : []), 'Click to change filters');
    return lines.join('\n');
  });
}
