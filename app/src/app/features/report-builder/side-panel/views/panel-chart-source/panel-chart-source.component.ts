import { Component, input } from '@angular/core';
import { ChartWidgetModel } from '../../../models/widget.model';
import { ChartTypePanelDirective, ChartTypePanels } from '../../chart-type-panel.directive';
import { PanelBarChartSourceComponent } from '../panel-bar-chart-source/panel-bar-chart-source.component';
import { PanelBoxPlotSourceComponent } from '../panel-box-plot-source/panel-box-plot-source.component';
import { PanelChartSeriesListComponent } from '../panel-chart-series-list/panel-chart-series-list.component';
import { PanelHistogramSourceComponent } from '../panel-histogram-source/panel-histogram-source.component';

/**
 * The data-source section of the chart detail panel, dispatched by chart type. A point
 * chart (scatter/line) overlays one free X→Y series per dataset, so it reuses the series
 * list directly; bar, box, and histogram each shape their data differently and bring
 * their own source panel.
 */
@Component({
  selector: 'app-panel-chart-source',
  imports: [ChartTypePanelDirective],
  template: `<ng-container [appChartTypePanel]="chart()" [panels]="panels" />`,
})
export class PanelChartSourceComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  public readonly panels: ChartTypePanels = {
    scatterChart: PanelChartSeriesListComponent,
    lineChart: PanelChartSeriesListComponent,
    barChart: PanelBarChartSourceComponent,
    boxPlot: PanelBoxPlotSourceComponent,
    histogram: PanelHistogramSourceComponent,
  };
}
