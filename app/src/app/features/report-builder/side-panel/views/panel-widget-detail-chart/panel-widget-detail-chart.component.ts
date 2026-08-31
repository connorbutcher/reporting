import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { BarChartWidgetModel, ChartWidgetModel, LineChartWidgetModel } from '../../../models/widget.model';
import { Aggregate, AxisSide } from '../../../../../core/models/report';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelBarChartOptionsComponent } from '../panel-bar-chart-options/panel-bar-chart-options.component';
import { PanelChartSeriesListComponent } from '../panel-chart-series-list/panel-chart-series-list.component';
import { PanelChartToleranceListComponent } from '../panel-chart-tolerance-list/panel-chart-tolerance-list.component';
import { PanelChartTooltipColumnsComponent } from '../panel-chart-tooltip-columns/panel-chart-tooltip-columns.component';
import { PanelLineChartOptionsComponent } from '../panel-line-chart-options/panel-line-chart-options.component';

/** The chart branch of the widget-detail panel: dataset, axes, series, and appearance. Tolerance bands and tooltip are their own groups. */
@Component({
  selector: 'app-panel-widget-detail-chart',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
    PanelBarChartOptionsComponent,
    PanelChartSeriesListComponent,
    PanelChartToleranceListComponent,
    PanelChartTooltipColumnsComponent,
    PanelLineChartOptionsComponent,
  ],
  templateUrl: './panel-widget-detail-chart.component.html',
})
export class PanelWidgetDetailChartComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** The datasets on this report, for the data-source picker. */
  public readonly datasets = inject(ReportSession).datasets;

  /** The aggregate options offered for a bar chart, in menu order. */
  public readonly aggregates: { label: string; value: Aggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];

  /** The model narrowed to a line chart, so line-only options render only for it. */
  public readonly lineChart = computed(() => {
    const chart = this.chart();
    return chart instanceof LineChartWidgetModel ? chart : null;
  });

  /** The model narrowed to a bar chart, so bar-only fields render only for it. */
  public readonly barChart = computed(() => {
    const chart = this.chart();
    return chart instanceof BarChartWidgetModel ? chart : null;
  });

  /** The two sides a value axis can sit on, for the axis side picker. */
  public readonly axisSides: { label: string; value: AxisSide }[] = [
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ];

  /** Whether the X axis is numeric, so bounds and log scale are worth offering (a category X ignores them). */
  public readonly xIsNumeric = computed(() => {
    const chart = this.chart();
    const column = chart.axisColumns().find((c) => c.id === chart.xColumnId());
    return column?.type === 'int' || column?.type === 'double';
  });

  private readonly navigation = inject(PanelNavigation);

  /** Falls back to the picked axis column's own name once one is chosen. */
  public axisPlaceholder(columnId: string | null): string {
    return (
      this.chart()
        .axisColumns()
        .find((c) => c.id === columnId)?.name ?? ''
    );
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
