import { Component, input } from '@angular/core';

/**
 * The slim footer strip under a data widget that says how many rows it is showing — "Showing 40 of
 * 500 rows" — so a filtered or capped widget never passes itself off as the whole dataset. One
 * component so the table, pivot and chart widgets share a single look; each widget builds its own
 * label from the counts its query returned.
 */
@Component({
  selector: 'app-widget-count-bar',
  template: `<i class="pi" [class]="icon()" aria-hidden="true"></i>{{ label() }}`,
  styleUrl: './widget-count-bar.component.scss',
  host: {
    '[class.truncated]': 'truncated()',
  },
})
export class WidgetCountBarComponent {
  public readonly label = input.required<string>();
  /** The PrimeIcons class beside the label, e.g. `pi-filter`. */
  public readonly icon = input('pi-list');
  /** More rows exist than the widget could show (a row cap) — worth drawing the eye. */
  public readonly truncated = input(false);
}
