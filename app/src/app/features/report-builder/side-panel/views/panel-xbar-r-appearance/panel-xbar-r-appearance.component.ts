import { Component, input } from '@angular/core';
import { XBarRChartWidgetModel } from '../../../models/widget.model';
import { PanelXBarROptionsComponent } from '../panel-xbar-r-options/panel-xbar-r-options.component';

/**
 * Appearance options for an Xbar-R chart. It has no per-value labels, so this is just the
 * chart-only options (ordering, out-of-control highlight) — kept as its own panel so the shared
 * appearance host stays free of Xbar-R-specific carve-outs.
 */
@Component({
  selector: 'app-panel-xbar-r-appearance',
  imports: [PanelXBarROptionsComponent],
  template: `<app-panel-xbar-r-options [chart]="chart()" />`,
})
export class PanelXBarRAppearanceComponent {
  public readonly chart = input.required<XBarRChartWidgetModel>();
}
