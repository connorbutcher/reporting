import { Component, Signal, computed, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { DatasetSummary } from '../../../../../core/models/dataset';
import { KpiWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { ToleranceSourcePicker } from '../../../state/tolerance-source-picker';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * A KPI's tolerance band: a dataset, one row in it (the active spec), and which of that row's
 * columns hold the min, max, and optional concession bounds — the same "point at a spec row"
 * picker a table column's tolerance panel uses, here configuring the one band a KPI checks its
 * value column against rather than a per-column one.
 */
@Component({
  selector: 'app-panel-widget-detail-kpi-tolerance',
  imports: [FormsModule, ButtonModule, CheckboxModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-widget-detail-kpi-tolerance.component.html',
  providers: [ToleranceSourcePicker],
})
export class PanelWidgetDetailKpiToleranceComponent {
  public static readonly title = 'Tolerance limits';

  public readonly picker = inject(ToleranceSourcePicker);

  /** The KPI's own dataset columns, from which the identifier that picks each row's limits is chosen. */
  public readonly kpiColumns = computed(() => this.kpi()?.schema()?.columns ?? []);

  private readonly session = inject(ReportSession);
  private seeded = false;

  constructor() {
    // Seeds the draft when the panel opens on a (possibly different) widget.
    effect(() => {
      const kpi = this.kpi();
      if (!kpi || this.seeded) return;
      this.seeded = true;

      const tolerance = untracked(() => kpi.tolerance());
      untracked(() => this.picker.seed(tolerance));
    });

    // Writes back once the draft is complete; an in-progress edit leaves
    // whatever was last saved untouched rather than persisting a half state.
    effect(() => {
      const tolerance = this.picker.toColumnTolerance();
      if (!tolerance) return;
      untracked(() => this.kpi()?.setTolerance(tolerance));
    });
  }

  public clear(): void {
    this.picker.selectDataset(null);
    this.kpi()?.setTolerance(null);
  }

  public get datasets(): Signal<DatasetSummary[]> {
    return this.session.datasets;
  }

  public get kpi(): Signal<KpiWidgetModel | null> {
    return this.session.selectedKpiWidget;
  }
}
