import { Component, input } from '@angular/core';
import { HistogramWidgetModel } from '../../../models/widget.model';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelChartSeriesListComponent } from '../panel-chart-series-list/panel-chart-series-list.component';

/** The histogram's data source: each overlaid distribution picks its own dataset and column. */
@Component({
  selector: 'app-panel-histogram-source',
  imports: [PanelGroupComponent, PanelChartSeriesListComponent],
  templateUrl: './panel-histogram-source.component.html',
})
export class PanelHistogramSourceComponent {
  public readonly chart = input.required<HistogramWidgetModel>();
}
