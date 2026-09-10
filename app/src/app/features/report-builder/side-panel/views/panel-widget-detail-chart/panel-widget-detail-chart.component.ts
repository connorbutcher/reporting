import { Component, computed, input } from '@angular/core';
import {
  BarChartWidgetModel,
  BoxPlotWidgetModel,
  ChartWidgetModel,
  HistogramWidgetModel,
} from '../../../models/widget.model';
import { PanelChartAppearanceComponent } from '../panel-chart-appearance/panel-chart-appearance.component';
import { PanelChartAxisListComponent } from '../panel-chart-axis-list/panel-chart-axis-list.component';
import { PanelChartSourceComponent } from '../panel-chart-source/panel-chart-source.component';
import { PanelChartToleranceListComponent } from '../panel-chart-tolerance-list/panel-chart-tolerance-list.component';
import { PanelChartTooltipColumnsComponent } from '../panel-chart-tooltip-columns/panel-chart-tooltip-columns.component';

/**
 * The chart branch of the widget-detail panel. A fixed frame — data source, axes,
 * appearance, tolerance bands — each of which resolves its own chart-type differences,
 * so this component holds no per-kind branching itself. Only the tooltip is gated here,
 * since it exists solely for point charts.
 */
@Component({
  selector: 'app-panel-widget-detail-chart',
  imports: [
    PanelChartSourceComponent,
    PanelChartAxisListComponent,
    PanelChartAppearanceComponent,
    PanelChartToleranceListComponent,
    PanelChartTooltipColumnsComponent,
  ],
  templateUrl: './panel-widget-detail-chart.component.html',
})
export class PanelWidgetDetailChartComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** A point chart (scatter/line) has a per-point tooltip; category charts (bar/box/histogram) don't. */
  public readonly isPointChart = computed(() => {
    const chart = this.chart();
    return !(
      chart instanceof BarChartWidgetModel ||
      chart instanceof BoxPlotWidgetModel ||
      chart instanceof HistogramWidgetModel
    );
  });
}
