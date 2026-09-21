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
 * Associates a numeric column with pass/fail limits: a dataset, one row in it
 * (the active spec), and which of that row's columns hold the min, max, and
 * optional concession bounds. Optionally the row is chosen per data row instead,
 * by matching a value in the table against a column of the limits dataset.
 * Resolution happens where the table renders — this view only records the pointers.
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

  /** The table's own dataset columns, from which the identifier that picks each row's limits is chosen. */
  protected readonly tableColumns = computed(() => this.table()?.schema()?.columns ?? []);

  private lastColumnId: string | null = null;

  constructor() {
    // Seeds the draft when the panel opens on a (possibly different) column.
    // Guarded on the id itself, not just presence, so the write-back effect
    // below re-triggering this computed doesn't refetch the source dataset.
    effect(() => {
      const columnId = this.columnId();
      const column = this.column();
      if (!column || columnId === this.lastColumnId) return;
      this.lastColumnId = columnId;

      const tolerance = untracked(() => column.tolerance());
      untracked(() => this.picker.seed(tolerance));
    });

    // Writes back once the draft is complete; an in-progress edit leaves
    // whatever was last saved untouched rather than persisting a half state.
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
