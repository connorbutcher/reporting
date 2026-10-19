import { Component, input, output } from '@angular/core';

/**
 * The "download a screenshot" / "download the data" / "view full screen" buttons
 * shown in the header of every exportable widget (chart, table, pivot) — one
 * template so the builder and viewer headers don't each restyle their own set.
 * The clicks just bubble up as outputs; the header decides what exporting (via
 * {@link WidgetExportBase}) and full screen actually mean.
 */
@Component({
  selector: 'app-widget-export-actions',
  templateUrl: './widget-export-actions.component.html',
  styleUrl: './widget-export-actions.component.scss',
})
export class WidgetExportActionsComponent {
  /** Off inside the full screen dialog itself, where expanding further has nothing to do. */
  readonly expandable = input(true);

  readonly screenshot = output<void>();
  readonly exportCsv = output<void>();
  readonly expand = output<void>();
}
