import { Component, input } from '@angular/core';
import { BoxPlotWidgetModel } from '../../../models/widget.model';
import { PanelBoxPlotOptionsComponent } from '../panel-box-plot-options/panel-box-plot-options.component';

/**
 * Appearance options for a box plot. It has no per-value labels, so this is just the
 * box-only options (whiskers, ordering, overlays, orientation) — kept as its own panel
 * so the shared appearance host stays free of box-specific carve-outs.
 */
@Component({
  selector: 'app-panel-box-plot-appearance',
  imports: [PanelBoxPlotOptionsComponent],
  template: `<app-panel-box-plot-options [chart]="chart()" />`,
})
export class PanelBoxPlotAppearanceComponent {
  public readonly chart = input.required<BoxPlotWidgetModel>();
}
