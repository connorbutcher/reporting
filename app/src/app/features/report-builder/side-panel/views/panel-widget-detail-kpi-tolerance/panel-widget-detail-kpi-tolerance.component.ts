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

/** The one tolerance band a KPI checks its value against, using the same spec-row picker as a table column. */
@Component({
  selector: 'app-panel-widget-detail-kpi-tolerance',
  imports: [FormsModule, ButtonModule, CheckboxModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-widget-detail-kpi-tolerance.component.html',
  providers: [ToleranceSourcePicker],
})
export class PanelWidgetDetailKpiToleranceComponent {
  public static readonly title = 'Tolerance limits';

  public readonly picker = inject(ToleranceSourcePicker);

  /** The KPI's columns, for the identifier that picks each row's limits. */
  public readonly kpiColumns = computed(() => this.kpi()?.schema()?.columns ?? []);

  private readonly session = inject(ReportSession);
  private seeded = false;

  constructor() {
    // Seed when the panel opens on a widget.
    effect(() => {
      const kpi = this.kpi();
      if (!kpi || this.seeded) return;
      this.seeded = true;

      const tolerance = untracked(() => kpi.tolerance());
      untracked(() => this.picker.seed(tolerance));
    });

    // Write back only once complete, so a half-finished edit isn't saved.
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
