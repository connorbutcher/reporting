import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ChartAxis, LineDashStyle, LineDirection, chartAxisDisplayName } from '../../../../../core/models/report';
import { XBarRChartWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelGroupComponent } from '../../panel-group.component';

const AXIS_OPTIONS: { label: string; value: ChartAxis }[] = [
  { label: 'Y axis', value: 'y' },
  { label: 'X axis', value: 'x' },
];

const DASH_OPTIONS: { label: string; value: LineDashStyle }[] = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
];

const DIRECTION_OPTIONS: { label: string; value: LineDirection }[] = [
  { label: 'Above the line', value: 'above' },
  { label: 'Below the line', value: 'below' },
];

const DEFAULT_COLOR = '#4f46e5';

/**
 * A single dashed line drawn at a fixed value on an axis, captioned with a label — the
 * lightweight alternative to a tolerance band for marking a target, a cap, or any other
 * fixed point that doesn't need resolving against a separate limits dataset.
 */
@Component({
  selector: 'app-panel-chart-guide-line',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-chart-guide-line.component.html',
})
export class PanelChartGuideLineComponent {
  public static readonly title = 'Guide line';

  public readonly dashOptions = DASH_OPTIONS;
  public readonly directionOptions = DIRECTION_OPTIONS;
  public readonly defaultColor = DEFAULT_COLOR;

  /** "the range"/"the line" so the outline checkbox's label matches whichever shape the line currently is. */
  public readonly outlineLabel = computed(() => {
    const line = this.line();
    const isRange = line?.valueTo !== null && line?.valueTo !== undefined;
    return isRange ? 'Outline points outside the range' : 'Outline points past this line';
  });

  /**
   * Only axes bound to a numeric column can carry a line — a line is a fixed numeric
   * value, meaningless on a category (text) axis. Falls back to both when neither is
   * numeric so the control still renders.
   */
  public readonly axisOptions = computed(() => {
    const chart = this.chart();
    if (!chart) return AXIS_OPTIONS;
    // A control chart's X axis is its subgroups, with no numeric scale to place a line on.
    if (chart instanceof XBarRChartWidgetModel) return AXIS_OPTIONS.filter((o) => o.value === 'y');
    const numeric = new Set(chart.numericColumns().map((c) => c.id));
    const options = AXIS_OPTIONS.filter((o) =>
      numeric.has((o.value === 'x' ? chart.xColumnId() : chart.yColumnId()) ?? ''),
    );
    return options.length ? options : AXIS_OPTIONS;
  });

  public readonly line = computed(() => {
    const lineId = this.lineId();
    return lineId ? (this.chart()?.guideLine(lineId) ?? null) : null;
  });

  /** Same reasoning as {@link PanelChartToleranceBandComponent.yAxisOptions}: numeric axes only. */
  public readonly yAxisOptions = computed(() => {
    const chart = this.chart();
    if (!chart) return [];
    const axes = chart.yAxes();
    const numeric = axes.filter((a) => this.axisIsNumeric(a.id));
    return (numeric.length ? numeric : axes).map((axis) => ({
      label: chartAxisDisplayName(axis, axes.indexOf(axis)),
      value: axis.id,
    }));
  });

  private readonly navigation = inject(PanelNavigation);
  private readonly chart = inject(ReportSession).selectedChartWidget;

  private readonly lineId = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'chartGuideLine' ? view.lineId : null;
  });

  public setAxis(axis: ChartAxis): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { axis });
  }

  public setYAxis(yAxisId: string | null): void {
    const lineId = this.lineId();
    if (!lineId) return;
    // Store null for the primary axis so the line stays anchored to it even if the axis
    // list is later reordered.
    const primaryId = this.chart()?.yAxes()[0]?.id ?? null;
    this.chart()?.updateGuideLine(lineId, { yAxisId: yAxisId === primaryId ? null : yAxisId });
  }

  public setValue(value: number | null): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { value: value ?? 0 });
  }

  /** Toggles this line between a single value and a region — seeding `valueTo` with the
   * current value so a freshly-turned-on range starts zero-width and visibly expandable. */
  public setRange(isRange: boolean): void {
    const lineId = this.lineId();
    const line = this.line();
    if (!lineId || !line) return;
    this.chart()?.updateGuideLine(lineId, { valueTo: isRange ? line.value : null });
  }

  public setValueTo(valueTo: number | null): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { valueTo: valueTo ?? 0 });
  }

  public setFill(fill: boolean): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { fill });
  }

  public setDirection(direction: LineDirection): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { direction });
  }

  public setOutlinePoints(outlinePoints: boolean): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { outlinePoints });
  }

  public setLabel(label: string): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { label });
  }

  public setColor(color: string | null): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { color });
  }

  public setDashStyle(dashStyle: LineDashStyle | null): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.updateGuideLine(lineId, { dashStyle });
  }

  public remove(): void {
    const lineId = this.lineId();
    if (lineId) this.chart()?.removeGuideLine(lineId);
    this.navigation.back();
  }

  /** Whether any series plotted on the given Y axis binds a numeric column, i.e. it's a value axis. */
  private axisIsNumeric(axisId: string): boolean {
    const chart = this.chart();
    if (!chart) return false;
    const primaryId = chart.yAxes()[0]?.id;
    return chart.bindings().some((binding) => {
      if ((binding.yAxisId() ?? primaryId) !== axisId) return false;
      const yId = binding.yColumnId();
      return !!yId && binding.numericColumns().some((c) => c.id === yId);
    });
  }
}
