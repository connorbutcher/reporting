import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AxisLabelRotation, AxisSide } from '../../../../../core/models/report';
import { BarChartWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * One axis's full configuration — the shared X axis (label, and for a numeric point
 * chart its bounds and log scale) or one value (Y) axis (label, side, bounds, log
 * scale). Reached from the axes list on the chart detail panel, so the list stays a
 * scannable summary rather than a stack of long per-axis cards.
 */
@Component({
  selector: 'app-panel-chart-axis',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-chart-axis.component.html',
})
export class PanelChartAxisComponent {
  public static readonly title = 'Axis';

  public readonly chart = inject(ReportSession).selectedChartWidget;

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

  /** Whether this screen edits the shared X axis (vs a value axis). */
  public readonly isX = computed(() => this.view()?.axis === 'x');

  /** The chart narrowed to a bar chart, so bar-only rules apply (single value axis, no bounds). */
  public readonly barChart = computed(() => {
    const chart = this.chart();
    return chart instanceof BarChartWidgetModel ? chart : null;
  });

  /** The value axis being edited with its position, or null for the X axis / once removed. */
  public readonly yAxis = computed(() => {
    const view = this.view();
    const chart = this.chart();
    if (!chart || !view || view.axis !== 'y') return null;
    const index = chart.yAxes().findIndex((a) => a.id === view.axisId);
    return index < 0 ? null : { axis: chart.yAxes()[index], index };
  });

  /** Bounds and log scale are only meaningful when the X axis is a numeric column. */
  public readonly xIsNumeric = computed(() => {
    const chart = this.chart();
    if (!chart) return false;
    const column = chart.axisColumns().find((c) => c.id === chart.xColumnId());
    return column?.type === 'int' || column?.type === 'double';
  });

  /** The primary (first) value axis can't be removed, so a chart always keeps one. */
  public readonly canRemove = computed(() => (this.yAxis()?.index ?? 0) > 0);

  private readonly navigation = inject(PanelNavigation);

  private readonly view = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'chartAxis' ? view : null;
  });

  /** Falls back to the bound X column's own name once one is chosen. */
  public xPlaceholder(): string {
    const chart = this.chart();
    if (!chart) return '';
    return chart.axisColumns().find((c) => c.id === chart.xColumnId())?.name ?? '';
  }

  /** The primary value axis defaults to the bound Y column's name; further axes to a positional label. */
  public yPlaceholder(index: number): string {
    if (index > 0) return 'Axis ' + (index + 1);
    const chart = this.chart();
    if (!chart) return '';
    return chart.axisColumns().find((c) => c.id === chart.yColumnId())?.name ?? '';
  }

  /** Removes this value axis and steps back to the list. */
  public remove(): void {
    const y = this.yAxis();
    if (y) this.chart()?.removeYAxis(y.axis.id);
    this.navigation.back();
  }
}
