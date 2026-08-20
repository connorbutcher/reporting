import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ReportBuilderStore } from '../../../report-builder.store';

@Component({
  selector: 'app-panel-add-column',
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './panel-add-column.component.html',
})
export class PanelAddColumnComponent {
  static readonly title = 'Add column';

  private readonly store = inject(ReportBuilderStore);
  protected readonly table = this.store.selectedTableWidget;

  protected readonly search = signal('');

  /** Columns still available, narrowed by the search box. */
  protected readonly matches = computed(() => {
    const available = this.table()?.availableColumns() ?? [];
    const term = this.search().trim().toLowerCase();
    if (!term) return available;
    return available.filter((column) => column.name.toLowerCase().includes(term));
  });

  protected readonly addAllLabel = computed(() => {
    const count = this.matches().length;
    return this.search().trim() ? `Add ${count} matching` : `Add all ${count}`;
  });

  protected add(columnId: string): void {
    this.table()?.addColumn(columnId);
    // Straight back to the list so several columns can be added in a row.
    this.store.back();
  }

  protected addAll(): void {
    this.table()?.addColumns(this.matches().map((column) => column.id));
    this.store.back();
  }
}
