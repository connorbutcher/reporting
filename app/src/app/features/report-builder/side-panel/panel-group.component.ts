import { Component, input } from '@angular/core';

/** A collapsible field group on the native `<details>` element, so the browser owns open state and a11y. */
@Component({
  selector: 'app-panel-group',
  imports: [],
  template: `
    <details class="panel-group" [open]="open()">
      <summary class="panel-group-head">
        @if (icon()) {
          <span class="panel-group-icon" aria-hidden="true">{{ icon() }}</span>
        }
        {{ label() }}
      </summary>
      <div class="panel-group-body">
        <ng-content />
      </div>
    </details>
  `,
})
export class PanelGroupComponent {
  readonly label = input.required<string>();
  /** A glyph before the label; empty shows none. */
  readonly icon = input('');
  /** The initial state only; rarely used groups pass `false` to keep long panels scannable. */
  readonly open = input(true);
}
