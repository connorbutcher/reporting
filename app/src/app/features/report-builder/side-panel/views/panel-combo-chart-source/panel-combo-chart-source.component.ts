import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Aggregate } from '../../../../../core/models/report';
import { ComboChartWidgetModel } from '../../../models/widget.model';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelChartSeriesListComponent } from '../panel-chart-series-list/panel-chart-series-list.component';

@Component({
  selector: 'app-panel-combo-chart-source',
  imports: [FormsModule, SelectModule, PanelGroupComponent, PanelChartSeriesListComponent],
  templateUrl: './panel-combo-chart-source.component.html',
})
export class PanelComboChartSourceComponent {
  public readonly chart = input.required<ComboChartWidgetModel>();

  /** Shared by every series, bars and lines alike. */
  public readonly aggregates: { label: string; value: Aggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];
}
