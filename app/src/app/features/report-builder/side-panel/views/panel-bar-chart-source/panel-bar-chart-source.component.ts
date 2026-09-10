import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Aggregate } from '../../../../../core/models/report';
import { BarChartWidgetModel } from '../../../models/widget.model';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelChartSeriesListComponent } from '../panel-chart-series-list/panel-chart-series-list.component';

/** The bar chart's data source: how bars summarise their values, and the per-dataset series. */
@Component({
  selector: 'app-panel-bar-chart-source',
  imports: [FormsModule, SelectModule, PanelGroupComponent, PanelChartSeriesListComponent],
  templateUrl: './panel-bar-chart-source.component.html',
})
export class PanelBarChartSourceComponent {
  public readonly chart = input.required<BarChartWidgetModel>();

  /** The aggregate options offered for a bar chart, in menu order. */
  public readonly aggregates: { label: string; value: Aggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];
}
