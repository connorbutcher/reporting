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

/** The chart widget panel: a fixed frame whose sections each handle their own chart-type differences. */
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

  /** Bar, combination, box and histogram charts summarise tooltip columns per mark. */
  public readonly hasGroupedTooltip = computed(() => {
    const chart = this.chart();
    return (
      chart instanceof BarChartWidgetModel ||
      chart instanceof ComboChartWidgetModel ||
      chart instanceof BoxPlotWidgetModel ||
      chart instanceof HistogramWidgetModel
    );
  });

  /** Scatter and line charts have a per-point tooltip. */
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
