import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ChartAxis } from '../../../../../core/models/report';
import { ReportBuilderStore } from '../../../report-builder.store';
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
  imports: [FormsModule, ButtonModule, SelectModule, SelectButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-tolerance-band.component.html',
  providers: [ToleranceSourcePicker],
})
export class PanelChartToleranceBandComponent {
  static readonly title = 'Tolerance band';

  private readonly store = inject(ReportBuilderStore);

  protected readonly datasets = this.store.datasets;
  protected readonly axisOptions = AXIS_OPTIONS;
  protected readonly picker = inject(ToleranceSourcePicker);

  private readonly chart = this.store.selectedChartWidget;

  private readonly bandId = computed(() => {
    const view = this.store.view();
    return view.kind === 'chartToleranceBand' ? view.bandId : null;
  });

  protected readonly band = computed(() => {
    const bandId = this.bandId();
    return bandId ? (this.chart()?.toleranceBand(bandId) ?? null) : null;
  });

  protected readonly axis = signal<ChartAxis>('y');

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

  protected remove(): void {
    const bandId = this.bandId();
    if (bandId) this.chart()?.removeToleranceBand(bandId);
    this.store.back();
  }
}
