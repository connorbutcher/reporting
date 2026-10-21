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
  public static readonly title = 'Columns';

  public readonly widgetId = computed(() => this.table()?.id ?? null);

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public openSettings(columnId: string): void {
    const widgetId = this.widgetId();
    if (widgetId) this.navigation.navigate({ kind: 'columnSettings', widgetId, columnId });
  }

  public openAdd(): void {
    const widgetId = this.widgetId();
    if (widgetId) this.navigation.navigate({ kind: 'addColumn', widgetId });
  }

  public get table() {
    return this.session.selectedTableWidget;
  }
}
