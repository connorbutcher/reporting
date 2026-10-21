import { Component, computed, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ToleranceSourcePicker } from '../../../state/tolerance-source-picker';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * Points a numeric column at pass/fail limits: a dataset, a spec row (or a per-row match) and the
 * columns holding the bounds. The table resolves them when it renders.
 */
@Component({
  selector: 'app-panel-column-tolerance',
  imports: [FormsModule, ButtonModule, CheckboxModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-column-tolerance.component.html',
  providers: [ToleranceSourcePicker],
})
export class PanelColumnToleranceComponent {
  static readonly title = 'Tolerance limits';

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  protected readonly datasets = this.session.datasets;
  protected readonly picker = inject(ToleranceSourcePicker);

  private readonly table = this.session.selectedTableWidget;

  private readonly columnId = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'columnTolerance' ? view.columnId : null;
  });

  protected readonly column = computed(() => {
    const columnId = this.columnId();
    return columnId ? (this.table()?.column(columnId) ?? null) : null;
  });

  /** The table's columns, for the identifier that picks each row's limits. */
  protected readonly tableColumns = computed(() => this.table()?.schema()?.columns ?? []);

  private lastColumnId: string | null = null;

  constructor() {
    // Seed when the panel opens on a column. Keyed on the id so the write-back below doesn't refetch.
    effect(() => {
      const columnId = this.columnId();
      const column = this.column();
      if (!column || columnId === this.lastColumnId) return;
      this.lastColumnId = columnId;

      const tolerance = untracked(() => column.tolerance());
      untracked(() => this.picker.seed(tolerance));
    });

    // Write back only once complete, so a half-finished edit isn't saved.
    effect(() => {
      const tolerance = this.picker.toColumnTolerance();
      if (!tolerance) return;
      untracked(() => this.column()?.setTolerance(tolerance));
    });
  }

  protected clear(): void {
    this.picker.selectDataset(null);
    this.column()?.setTolerance(null);
  }
}
