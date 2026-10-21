import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AxisLabelRotation } from '../../../../../core/models/report';
import {
  BarChartWidgetModel,
  BoxPlotWidgetModel,
  ChartWidgetModel,
  ComboChartWidgetModel,
} from '../../../models/widget.model';
import { PanelGroupComponent } from '../../panel-group.component';
import { ColumnTypes } from '../../../models/column-types';

/** The shared X axis editor; bounds and log scale only for a numeric axis. */
@Component({
  selector: 'app-panel-chart-x-axis',
  imports: [
    FormsModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-chart-x-axis.component.html',
})
export class PanelChartXAxisComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** Cleared falls back to the default. */
  public readonly axisRotations: { label: string; value: AxisLabelRotation }[] = [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' },
  ];

  /** Bar, combo and box charts have a categorical X axis; a histogram's is numeric. */
  public readonly categorical = computed(() => {
    const chart = this.chart();
    return (
      chart instanceof BarChartWidgetModel ||
      chart instanceof ComboChartWidgetModel ||
      chart instanceof BoxPlotWidgetModel
    );
  });

  public readonly xIsNumeric = computed(() => {
    const chart = this.chart();
    const column = chart.axisColumns().find((c) => c.id === chart.xColumnId());
    return ColumnTypes.isNumeric(column?.type);
  });

  /** The bound X column's name once one is chosen. */
  public xPlaceholder(): string {
    const chart = this.chart();
    return chart.axisColumns().find((c) => c.id === chart.xColumnId())?.name ?? '';
  }
}
