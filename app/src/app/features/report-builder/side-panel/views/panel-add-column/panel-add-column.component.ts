import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';

@Component({
  selector: 'app-panel-add-column',
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './panel-add-column.component.html',
})
export class PanelAddColumnComponent {
  public static readonly title = 'Add column';

  public readonly search = signal('');

  /** Available columns, narrowed by the search box. */
  public readonly matches = computed(() => {
    const available = this.table()?.availableColumns() ?? [];
    const term = this.search().trim().toLowerCase();
    if (!term) return available;
    return available.filter((column) => column.name.toLowerCase().includes(term));
  });

  public readonly addAllLabel = computed(() => {
    const count = this.matches().length;
    return this.search().trim() ? `Add ${count} matching` : `Add all ${count}`;
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public add(columnId: string): void {
    this.table()?.addColumn(columnId);
    // Back to the list so several columns can be added in a row.
    this.navigation.back();
  }

  public addAll(): void {
    this.table()?.addColumns(this.matches().map((column) => column.id));
    this.navigation.back();
  }

  public get table() {
    return this.session.selectedTableWidget;
  }
}
