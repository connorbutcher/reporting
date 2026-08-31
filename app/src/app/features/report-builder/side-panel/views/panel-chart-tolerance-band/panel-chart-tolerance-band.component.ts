import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ChartAxis, chartAxisDisplayName } from '../../../../../core/models/report';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ToleranceSourcePicker } from '../../../state/tolerance-source-picker';
import { PanelGroupComponent } from '../../panel-group.component';

const AXIS_OPTIONS: { label: string; value: ChartAxis }[] = [
  { label: 'Y axis', value: 'y' },
  { label: 'X axis', value: 'x' },
];

/**
 * One dashed reference-line pair (min/max, optionally concession bounds) for
 * a chart, resolved against one row of a separate limits dataset — the chart
 * equivalent of a table column's tolerance. A chart can hold several bands.
 */
@Component({
  selector: 'app-panel-chart-tolerance-band',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    SelectModule,
    SelectButtonModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-chart-tolerance-band.component.html',
  providers: [ToleranceSourcePicker],
})
export class PanelChartToleranceBandComponent {
  public static readonly title = 'Tolerance band';

  public readonly datasets = inject(ReportSession).datasets;
  public readonly picker = inject(ToleranceSourcePicker);

  /**
   * Only axes bound to a numeric column can carry a band — a band is a numeric
   * min/max line, meaningless on a category (text) axis. Falls back to both when
   * neither is numeric so the control still renders.
   */
  public readonly axisOptions = computed(() => {
    const chart = this.chart();
    if (!chart) return AXIS_OPTIONS;
    const numeric = new Set(chart.numericColumns().map((c) => c.id));
    const options = AXIS_OPTIONS.filter((o) =>
      numeric.has((o.value === 'x' ? chart.xColumnId() : chart.yColumnId()) ?? ''),
    );
    return options.length ? options : AXIS_OPTIONS;
  });

  public readonly band = computed(() => {
    const bandId = this.bandId();
    return bandId ? (this.chart()?.toleranceBand(bandId) ?? null) : null;
  });

  public readonly axis = signal<ChartAxis>('y');

  /**
   * The chart's numeric value axes as picker options — offered only when a `y` band
   * has more than one to choose from, so it can draw on the scale of the series it
   * bounds rather than always the primary. Category axes are excluded (a numeric
   * min/max band is meaningless on them); if none resolve as numeric yet (schema
   * still loading) it falls back to every axis so the control still renders.
   */
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

  private readonly bandId = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'chartToleranceBand' ? view.bandId : null;
  });

  private lastBandId: string | null = null;

  constructor() {
    // Seeds the draft when the panel opens on a (possibly different) band.
    // Guarded on the id itself, not just presence, so the write-back effect
    // below re-triggering this computed doesn't refetch the source dataset.
    effect(() => {
      const bandId = this.bandId();
      const band = this.band();
      if (!band || bandId === this.lastBandId) return;
      this.lastBandId = bandId;

      untracked(() => {
        this.axis.set(band.axis);
        this.picker.seed(band);
      });
    });

    // Writes back once the draft is complete; an in-progress edit leaves
    // whatever was last saved untouched rather than persisting a half state.
    effect(() => {
      const bandId = this.bandId();
      const axis = this.axis();
      const pointer = this.picker.toPointer();
      if (!bandId || !pointer) return;

      untracked(() => this.chart()?.updateToleranceBand(bandId, { axis, ...pointer }));
    });
  }

  public setYAxis(yAxisId: string | null): void {
    const bandId = this.bandId();
    if (!bandId) return;
    // Store null for the primary axis so the band stays anchored to it even if the
    // axis list is later reordered.
    const primaryId = this.chart()?.yAxes()[0]?.id ?? null;
    this.chart()?.updateToleranceBand(bandId, {
      yAxisId: yAxisId === primaryId ? null : yAxisId,
    });
  }

  public setFill(fill: boolean): void {
    const bandId = this.bandId();
    if (bandId) this.chart()?.updateToleranceBand(bandId, { fill });
  }

  public setOutlinePoints(outlinePoints: boolean): void {
    const bandId = this.bandId();
    if (bandId) this.chart()?.updateToleranceBand(bandId, { outlinePoints });
  }

  public remove(): void {
    const bandId = this.bandId();
    if (bandId) this.chart()?.removeToleranceBand(bandId);
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
