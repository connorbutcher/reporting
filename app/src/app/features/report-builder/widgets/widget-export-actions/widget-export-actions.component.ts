import { Component, output } from '@angular/core';

/**
 * The small floating toolbar every exportable widget (chart, table, pivot)
 * shows for "download a screenshot" / "download the data" — one template so
 * the three don't each restyle their own pair of buttons. The click just
 * bubbles up as an output; the host decides what exporting actually means via
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
