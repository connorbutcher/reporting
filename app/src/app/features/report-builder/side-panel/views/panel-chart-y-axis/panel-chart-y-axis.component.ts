import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AxisLabelRotation, AxisSide, ChartValueAxis } from '../../../../../core/models/report';
import {
  BarChartWidgetModel,
  BoxPlotWidgetModel,
  ChartWidgetModel,
} from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * One value (Y) axis editor: label, rotation and interval, and — for a point chart — its
 * side, bounds, and log scale. Reached from the axes list on the chart detail panel; the
 * primary axis can't be removed, so a chart always keeps one.
 */
@Component({
  selector: 'app-panel-chart-y-axis',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-chart-y-axis.component.html',
})
export class PanelChartYAxisComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** The value axis being edited. */
  public readonly axis = input.required<ChartValueAxis>();

  /** Its position among the chart's value axes; the first (index 0) is the primary. */
  public readonly index = input.required<number>();

  /** The two sides a value axis can sit on, for the side picker. */
  public readonly axisSides: { label: string; value: AxisSide }[] = [
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ];

  /** The tick-label orientations, for the rotation picker; cleared falls back to the default. */
  public readonly axisRotations: { label: string; value: AxisLabelRotation }[] = [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' },
  ];

  /** Bar and box plots have a single value axis with no side/bounds/log-scale controls. */
  public readonly categorical = computed(() => {
    const chart = this.chart();
    return chart instanceof BarChartWidgetModel || chart instanceof BoxPlotWidgetModel;
  });

  /** The primary (first) value axis can't be removed, so a chart always keeps one. */
  public readonly canRemove = computed(() => this.index() > 0);

  private readonly navigation = inject(PanelNavigation);

  /** The primary value axis defaults to the bound Y column's name; further axes to a positional label. */
  public yPlaceholder(): string {
    if (this.index() > 0) return 'Axis ' + (this.index() + 1);
    const chart = this.chart();
    return chart.axisColumns().find((c) => c.id === chart.yColumnId())?.name ?? '';
  }

  /** Removes this value axis and steps back to the list. */
  public remove(): void {
    this.chart().removeYAxis(this.axis().id);
    this.navigation.back();
  }
}
