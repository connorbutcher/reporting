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

/** One value axis editor; side, bounds and log scale for point charts only. */
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

  public readonly axis = input.required<ChartValueAxis>();

  /** Index 0 is the primary axis. */
  public readonly index = input.required<number>();

  public readonly axisSides: { label: string; value: AxisSide }[] = [
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ];

  /** Cleared falls back to the default. */
  public readonly axisRotations: { label: string; value: AxisLabelRotation }[] = [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' },
  ];

  /** Bar and box plots have a single value axis with no side, bounds or log scale. */
  public readonly categorical = computed(() => {
    const chart = this.chart();
    return chart instanceof BarChartWidgetModel || chart instanceof BoxPlotWidgetModel;
  });

  /** The primary axis can't be removed. */
  public readonly canRemove = computed(() => this.index() > 0);

  private readonly navigation = inject(PanelNavigation);

  /** The primary axis defaults to the Y column's name, others to a positional label. */
  public yPlaceholder(): string {
    if (this.index() > 0) {
      return 'Axis ' + (this.index() + 1);
    }
    const chart = this.chart();
    return chart.axisColumns().find((c) => c.id === chart.yColumnId())?.name ?? '';
  }

  /** Removes this axis and returns to the list. */
  public remove(): void {
    this.chart().removeYAxis(this.axis().id);
    this.navigation.back();
  }
}
