import { Component, computed, input, output } from '@angular/core';

/**
 * The slim footer strip under a data widget that says how many rows it is showing — "Showing 40 of
 * 500 rows" — so a filtered or capped widget never passes itself off as the whole dataset. One
 * component so the table, pivot and chart widgets share a single look; each widget builds its own
 * label from the counts its query returned.
 *
 * Hover names what is narrowing the widget ({@link filters}); where the host can show a widget's
 * filters ({@link actionable}) the strip is a button that asks for them.
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
  /** The widget is showing less than everything — a row cap, or a series that failed to load. */
  public readonly warning = input(false);
  /** What is narrowing the widget, one entry per condition, listed in the hover text. */
  public readonly filters = input<readonly string[]>([]);
  /** Whether the host can open this widget's filters; makes the strip clickable. */
  public readonly actionable = input(false);

  /** The strip was clicked (only when {@link actionable}). */
  public readonly activate = output<void>();

  public readonly tooltip = computed(() => {
    const filters = this.filters();
    const lines = filters.length > 0 ? ['Filtered by:', ...filters.map((f) => `• ${f}`)] : [];
    if (this.actionable()) lines.push(...(lines.length > 0 ? [''] : []), 'Click to change filters');
    return lines.join('\n');
  });
}
