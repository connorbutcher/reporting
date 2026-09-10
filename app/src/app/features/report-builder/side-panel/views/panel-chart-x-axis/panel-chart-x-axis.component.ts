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
} from '../../../models/widget.model';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * The shared X axis editor: label, tick-label rotation and interval, and — for a numeric
 * point chart — its bounds and log scale. Reached from the axes list on the chart detail
 * panel.
 */
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

  /** The tick-label orientations, for the rotation picker; cleared falls back to the default. */
  public readonly axisRotations: { label: string; value: AxisLabelRotation }[] = [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' },
  ];

  /**
   * Bar and box plots have a categorical X axis, so their bounds, log scale, and the "fit
   * to data" toggle don't apply. A histogram's X axis is numeric, so those still do.
   */
  public readonly categorical = computed(() => {
    const chart = this.chart();
    return chart instanceof BarChartWidgetModel || chart instanceof BoxPlotWidgetModel;
  });

  /** Bounds and log scale are only meaningful when the X axis is a numeric column. */
  public readonly xIsNumeric = computed(() => {
    const chart = this.chart();
    const column = chart.axisColumns().find((c) => c.id === chart.xColumnId());
    return column?.type === 'int' || column?.type === 'double';
  });

  /** Falls back to the bound X column's own name once one is chosen. */
  public xPlaceholder(): string {
    const chart = this.chart();
    return chart.axisColumns().find((c) => c.id === chart.xColumnId())?.name ?? '';
  }
}
