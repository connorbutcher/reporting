import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { Aggregate, DateGrouping } from '../../../../../core/models/report';
import { LineChartWidgetModel } from '../../../models/widget.model';

@Component({
  selector: 'app-panel-line-chart-options',
  imports: [FormsModule, CheckboxModule, SelectModule],
  templateUrl: './panel-line-chart-options.component.html',
})
export class PanelLineChartOptionsComponent {
  public readonly chart = input.required<LineChartWidgetModel>();

  /** A date X column can be grouped by period before aggregating. */
  public readonly xIsDate = computed(() => {
    const chart = this.chart();
    const id = chart.xColumnId();
    return !!id && chart.schema()?.columns.find((c) => c.id === id)?.type === 'dateTime';
  });

  /** Null plots every row. */
  public readonly aggregates: { label: string; value: Aggregate | null }[] = [
    { label: 'Every row', value: null },
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Minimum', value: 'min' },
    { label: 'Maximum', value: 'max' },
  ];

  public readonly groupings: { label: string; value: DateGrouping | null }[] = [
    { label: 'Exact date', value: null },
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];
}
