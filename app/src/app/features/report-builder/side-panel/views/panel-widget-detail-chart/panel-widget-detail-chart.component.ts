import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { BarChartWidgetModel, ChartWidgetModel, LineChartWidgetModel } from '../../../models/widget.model';
import { Aggregate } from '../../../../../core/models/report';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelBarChartOptionsComponent } from '../panel-bar-chart-options/panel-bar-chart-options.component';
import { PanelChartAxisListComponent } from '../panel-chart-axis-list/panel-chart-axis-list.component';
import { PanelChartSeriesListComponent } from '../panel-chart-series-list/panel-chart-series-list.component';
import { PanelChartToleranceListComponent } from '../panel-chart-tolerance-list/panel-chart-tolerance-list.component';
import { PanelChartTooltipColumnsComponent } from '../panel-chart-tooltip-columns/panel-chart-tooltip-columns.component';
import { PanelLineChartOptionsComponent } from '../panel-line-chart-options/panel-line-chart-options.component';

/** The chart branch of the widget-detail panel: dataset, axes, series, and appearance. Tolerance bands and tooltip are their own groups. */
@Component({
  selector: 'app-panel-widget-detail-chart',
  imports: [
    FormsModule,
    CheckboxModule,
    InputNumberModule,
    SelectModule,
    PanelGroupComponent,
    PanelBarChartOptionsComponent,
    PanelChartAxisListComponent,
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

  private readonly navigation = inject(PanelNavigation);

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
