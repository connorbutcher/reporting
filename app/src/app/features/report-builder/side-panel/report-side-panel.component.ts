import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ReportBuilderStore } from '../report-builder.store';
import { PanelAddColumnComponent } from './views/panel-add-column.component';
import { PanelAddWidgetComponent } from './views/panel-add-widget.component';
import { PanelColumnListComponent } from './views/panel-column-list.component';
import { PanelColumnSettingsComponent } from './views/panel-column-settings.component';
import { PanelIssuesComponent } from './views/panel-issues.component';
import { PanelReportSettingsComponent } from './views/panel-report-settings.component';
import { PanelRootComponent } from './views/panel-root.component';
import { PanelTableAppearanceComponent } from './views/panel-table-appearance.component';
import { PanelTextStyleComponent } from './views/panel-text-style.component';
import { PanelReportFiltersComponent } from './views/panel-report-filters.component';
import { PanelWidgetDetailComponent } from './views/panel-widget-detail.component';
import { PanelWidgetFiltersComponent } from './views/panel-widget-filters.component';
import { PanelWidgetListComponent } from './views/panel-widget-list.component';

/** Chrome for the side panel: history controls, title, and the current view. */
@Component({
  selector: 'app-report-side-panel',
  imports: [
    ButtonModule,
    DividerModule,
    PanelRootComponent,
    PanelReportSettingsComponent,
    PanelWidgetListComponent,
    PanelWidgetDetailComponent,
    PanelAddWidgetComponent,
    PanelColumnListComponent,
    PanelAddColumnComponent,
    PanelColumnSettingsComponent,
    PanelTableAppearanceComponent,
    PanelTextStyleComponent,
    PanelWidgetFiltersComponent,
    PanelReportFiltersComponent,
    PanelIssuesComponent,
  ],
  templateUrl: './report-side-panel.component.html',
  styleUrl: './report-side-panel.component.scss',
})
export class ReportSidePanelComponent {
  protected readonly store = inject(ReportBuilderStore);

  protected readonly title = computed(() => {
    const view = this.store.view();
    switch (view.kind) {
      case 'report':
        return 'Report settings';
      case 'widgets':
        return 'Widgets';
      case 'addWidget':
        return 'Add widget';
      case 'widgetColumns':
        return 'Columns';
      case 'addColumn':
        return 'Add column';
      case 'tableAppearance':
        return 'Appearance';
      case 'textStyle':
        return 'Style';
      case 'widgetFilters':
        return 'Filters';
      case 'reportFilters':
        return 'Report filters';
      case 'issues':
        return 'Report issues';
      case 'columnSettings':
        return this.store.selectedTableWidget()?.column(view.columnId)?.label() ?? 'Column';
      case 'widget':
        return this.store.selectedWidget()?.label() ?? 'Widget';
      default:
        return 'Report builder';
    }
  });
}
