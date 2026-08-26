import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { BarChartWidgetModel, ChartWidgetModel, LineChartWidgetModel } from '../../../models/widget.model';
import { Aggregate } from '../../../../../core/models/report';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelBarChartOptionsComponent } from '../panel-bar-chart-options/panel-bar-chart-options.component';
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
    PanelChartToleranceListComponent,
    PanelChartTooltipColumnsComponent,
    PanelLineChartOptionsComponent,
  ],
  templateUrl: './panel-widget-detail-chart.component.html',
})
export class PanelWidgetDetailChartComponent {
  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  readonly chart = input.required<ChartWidgetModel>();

  /** The datasets on this report, for the data-source picker. */
  protected readonly datasets = this.session.datasets;

  /** The aggregate options offered for a bar chart, in menu order. */
  protected readonly aggregates: { label: string; value: Aggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];

  /** The model narrowed to a line chart, so line-only options render only for it. */
  protected readonly lineChart = computed(() => {
    const chart = this.chart();
    return chart instanceof LineChartWidgetModel ? chart : null;
  });

  /** The model narrowed to a bar chart, so bar-only fields render only for it. */
  protected readonly barChart = computed(() => {
    const chart = this.chart();
    return chart instanceof BarChartWidgetModel ? chart : null;
  });

  /** Falls back to the picked axis column's own name once one is chosen. */
  protected axisPlaceholder(columnId: string | null): string {
    return (
      this.chart()
        .axisColumns()
        .find((c) => c.id === columnId)?.name ?? ''
    );
  }

  protected navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
