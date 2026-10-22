import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import {
  ChartAxis,
  LineDashStyle,
  LineDirection,
  chartAxisDisplayName,
} from '../../../../../core/models/report';
import { XBarRChartWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelGroupComponent } from '../../panel-group.component';

/** A labelled line at a fixed value: a lightweight alternative to a tolerance band. */
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

  private static readonly AXIS_OPTIONS: { label: string; value: ChartAxis }[] = [
    { label: 'Y axis', value: 'y' },
    { label: 'X axis', value: 'x' },
  ];

  private static readonly DASH_OPTIONS: { label: string; value: LineDashStyle }[] = [
    { label: 'Solid', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'Dotted', value: 'dotted' },
  ];

  private static readonly DIRECTION_OPTIONS: { label: string; value: LineDirection }[] = [
    { label: 'Above the line', value: 'above' },
    { label: 'Below the line', value: 'below' },
  ];

  private static readonly DEFAULT_COLOR = '#4f46e5';

  public readonly dashOptions = PanelChartGuideLineComponent.DASH_OPTIONS;
  public readonly directionOptions = PanelChartGuideLineComponent.DIRECTION_OPTIONS;
  public readonly defaultColor = PanelChartGuideLineComponent.DEFAULT_COLOR;

  /** Matches the outline checkbox label to the line's current shape. */
  public readonly outlineLabel = computed(() => {
    const line = this.line();
    const isRange = line?.valueTo !== null && line?.valueTo !== undefined;
    return isRange ? 'Outline points outside the range' : 'Outline points past this line';
  });

  /** Only numeric axes can carry a line; falls back to both so the control still renders. */
  public readonly axisOptions = computed(() => {
    const chart = this.chart();
    if (!chart) {
      return PanelChartGuideLineComponent.AXIS_OPTIONS;
    }
    // A control chart's X axis is its subgroups, with no numeric scale.
    if (chart instanceof XBarRChartWidgetModel) {
      return PanelChartGuideLineComponent.AXIS_OPTIONS.filter((o) => o.value === 'y');
    }
    const numeric = new Set(chart.numericColumns().map((c) => c.id));
    const options = PanelChartGuideLineComponent.AXIS_OPTIONS.filter((o) =>
      numeric.has((o.value === 'x' ? chart.xColumnId() : chart.yColumnId()) ?? ''),
    );
    return options.length ? options : PanelChartGuideLineComponent.AXIS_OPTIONS;
  });

  public readonly line = computed(() => {
    const lineId = this.lineId();
    return lineId ? (this.chart()?.guideLine(lineId) ?? null) : null;
  });

  /** Numeric axes only, as for tolerance bands. */
  public readonly yAxisOptions = computed(() => {
    const chart = this.chart();
    if (!chart) {
      return [];
    }
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
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { axis });
    }
  }

  public setYAxis(yAxisId: string | null): void {
    const lineId = this.lineId();
    if (!lineId) {
      return;
    }
    // Null for the primary axis keeps the line on it even if axes are reordered.
    const primaryId = this.chart()?.yAxes()[0]?.id ?? null;
    this.chart()?.updateGuideLine(lineId, { yAxisId: yAxisId === primaryId ? null : yAxisId });
  }

  public setValue(value: number | null): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { value: value ?? 0 });
    }
  }

  /** Seeds `valueTo` with the current value, so a new range starts zero-width. */
  public setRange(isRange: boolean): void {
    const lineId = this.lineId();
    const line = this.line();
    if (!lineId || !line) {
      return;
    }
    this.chart()?.updateGuideLine(lineId, { valueTo: isRange ? line.value : null });
  }

  public setValueTo(valueTo: number | null): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { valueTo: valueTo ?? 0 });
    }
  }

  public setFill(fill: boolean): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { fill });
    }
  }

  public setDirection(direction: LineDirection): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { direction });
    }
  }

  public setOutlinePoints(outlinePoints: boolean): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { outlinePoints });
    }
  }

  public setLabel(label: string): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { label });
    }
  }

  public setColor(color: string | null): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { color });
    }
  }

  public setDashStyle(dashStyle: LineDashStyle | null): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.updateGuideLine(lineId, { dashStyle });
    }
  }

  public remove(): void {
    const lineId = this.lineId();
    if (lineId) {
      this.chart()?.removeGuideLine(lineId);
    }
    this.navigation.back();
  }

  /** Whether any series on the axis binds a numeric column. */
  private axisIsNumeric(axisId: string): boolean {
    const chart = this.chart();
    if (!chart) {
      return false;
    }
    const primaryId = chart.yAxes()[0]?.id;
    return chart.bindings().some((binding) => {
      if ((binding.yAxisId() ?? primaryId) !== axisId) {
        return false;
      }
      const yId = binding.yColumnId();
      return !!yId && binding.numericColumns().some((c) => c.id === yId);
    });
  }
}
