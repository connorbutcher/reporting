import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ReportBuilderStore } from '../../../report-builder.store';

@Component({
  selector: 'app-panel-column-list',
  imports: [ButtonModule],
  templateUrl: './panel-column-list.component.html',
  styleUrl: './panel-column-list.component.scss',
})
export class PanelColumnListComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly table = this.store.selectedTableWidget;
  protected readonly widgetId = computed(() => this.table()?.id ?? null);

  protected openSettings(columnId: string): void {
    const widgetId = this.widgetId();
    if (widgetId) this.store.navigate({ kind: 'columnSettings', widgetId, columnId });
  }

  protected openAdd(): void {
    const widgetId = this.widgetId();
    if (widgetId) this.store.navigate({ kind: 'addColumn', widgetId });
  }
}
