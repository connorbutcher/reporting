import { Component, output } from '@angular/core';

/**
 * The "download a screenshot" / "download the data" buttons shown in the header
 * of every exportable widget (chart, table, pivot) — one template so the
 * builder and viewer headers don't each restyle their own pair. The click just
 * bubbles up as an output; the header decides what exporting actually means via
 * {@link WidgetExportBase}.
 */
@Component({
  selector: 'app-widget-export-actions',
  templateUrl: './widget-export-actions.component.html',
  styleUrl: './widget-export-actions.component.scss',
})
export class WidgetExportActionsComponent {
  readonly screenshot = output<void>();
  readonly exportCsv = output<void>();
}
