import { Component, computed, input } from '@angular/core';
import {
  BarChartWidgetModel,
  BoxPlotWidgetModel,
  ChartWidgetModel,
  ComboChartWidgetModel,
  HistogramWidgetModel,
  XBarRChartWidgetModel,
} from '../../../models/widget.model';
import { PanelChartAppearanceComponent } from '../panel-chart-appearance/panel-chart-appearance.component';
import { PanelChartAxisListComponent } from '../panel-chart-axis-list/panel-chart-axis-list.component';
import { PanelChartGuideLineListComponent } from '../panel-chart-guide-line-list/panel-chart-guide-line-list.component';
import { PanelChartSourceComponent } from '../panel-chart-source/panel-chart-source.component';
import { PanelChartToleranceListComponent } from '../panel-chart-tolerance-list/panel-chart-tolerance-list.component';
import { PanelChartTooltipColumnsComponent } from '../panel-chart-tooltip-columns/panel-chart-tooltip-columns.component';

/**
 * The chart branch of the widget-detail panel. A fixed frame — data source, axes,
 * appearance, tolerance bands — each of which resolves its own chart-type differences,
 * so this component holds no per-kind branching itself. Only the tooltip is gated here,
 * since point charts (per row) and the grouping charts other than Xbar-R (per mark) have tooltip columns.
 */
@Component({
  selector: 'app-panel-widget-detail-chart',
  imports: [
    PanelChartSourceComponent,
    PanelChartAxisListComponent,
    PanelChartAppearanceComponent,
    PanelChartToleranceListComponent,
    PanelChartGuideLineListComponent,
    PanelChartTooltipColumnsComponent,
  ],
  templateUrl: './panel-widget-detail-chart.component.html',
})
export class PanelWidgetDetailChartComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** A bar, combination, box or histogram chart, whose tooltip columns are summarised per bar, box or bin. */
  public readonly hasGroupedTooltip = computed(() => {
    const chart = this.chart();
    return (
      chart instanceof BarChartWidgetModel ||
      chart instanceof ComboChartWidgetModel ||
      chart instanceof BoxPlotWidgetModel ||
      chart instanceof HistogramWidgetModel
    );
  });

  /** A point chart (scatter/line) has a per-point tooltip; category charts (bar/box/histogram) don't. */
  public readonly isPointChart = computed(() => {
    const chart = this.chart();
    return !(
      chart instanceof BarChartWidgetModel ||
      chart instanceof ComboChartWidgetModel ||
      chart instanceof BoxPlotWidgetModel ||
      chart instanceof HistogramWidgetModel ||
      chart instanceof XBarRChartWidgetModel
    );
  });
}
