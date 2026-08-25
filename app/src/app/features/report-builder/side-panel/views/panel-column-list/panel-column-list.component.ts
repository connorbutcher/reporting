import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';

@Component({
  selector: 'app-panel-column-list',
  imports: [ButtonModule],
  templateUrl: './panel-column-list.component.html',
  styleUrl: './panel-column-list.component.scss',
})
export class PanelColumnListComponent {
  static readonly title = 'Columns';

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  protected readonly table = this.session.selectedTableWidget;
  protected readonly widgetId = computed(() => this.table()?.id ?? null);

  protected openSettings(columnId: string): void {
    const widgetId = this.widgetId();
    if (widgetId) this.navigation.navigate({ kind: 'columnSettings', widgetId, columnId });
  }

  protected openAdd(): void {
    const widgetId = this.widgetId();
    if (widgetId) this.navigation.navigate({ kind: 'addColumn', widgetId });
  }
}
