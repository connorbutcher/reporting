import { Component, computed, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ReportBuilderStore } from '../../../report-builder.store';
import { ToleranceSourcePicker } from '../../../state/tolerance-source-picker';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * Associates a numeric column with pass/fail limits: a dataset, one row in it
 * (the active spec), and which of that row's columns hold the min, max, and
 * optional concession bounds. Resolution happens where the table renders —
 * this view only records the pointers.
 */
@Component({
  selector: 'app-panel-column-tolerance',
  imports: [FormsModule, ButtonModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-column-tolerance.component.html',
  providers: [ToleranceSourcePicker],
})
export class PanelColumnToleranceComponent {
  static readonly title = 'Tolerance limits';

  private readonly store = inject(ReportBuilderStore);

  protected readonly datasets = this.store.datasets;
  protected readonly picker = inject(ToleranceSourcePicker);

  private readonly table = this.store.selectedTableWidget;

  private readonly columnId = computed(() => {
    const view = this.store.view();
    return view.kind === 'columnTolerance' ? view.columnId : null;
  });

  protected readonly column = computed(() => {
    const columnId = this.columnId();
    return columnId ? (this.table()?.column(columnId) ?? null) : null;
  });

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
      const pointer = this.picker.toPointer();
      if (!pointer) return;
      untracked(() => this.column()?.setTolerance(pointer));
    });
  }

  protected clear(): void {
    this.picker.selectDataset(null);
    this.column()?.setTolerance(null);
  }
}
