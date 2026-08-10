import { Component, input } from '@angular/core';

/**
 * A collapsible field group, for panels with more sections than the chart
 * widget's single flat screen comfortably holds. Uses the native
 * `<details>` element, so expand/collapse needs no signal or click handler
 * of its own — the browser owns that state, keyboard and screen readers
 * included.
 */
@Component({
  selector: 'app-panel-group',
  imports: [],
  template: `
    <details class="panel-group" open>
      <summary class="panel-group__head">
        @if (icon()) {
          <span class="panel-group__icon" aria-hidden="true">{{ icon() }}</span>
        }
        {{ label() }}
      </summary>
      <div class="panel-group__body">
        <ng-content />
      </div>
    </details>
  `,
})
export class PanelGroupComponent {
  readonly label = input.required<string>();
  /** A short glyph shown before the label, e.g. an icon character. Omitted shows none. */
  readonly icon = input('');
}
