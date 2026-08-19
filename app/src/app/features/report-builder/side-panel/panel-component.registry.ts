import { Type } from '@angular/core';
import { PanelView } from './panel-view';
import { PanelAddColumnComponent } from './views/panel-add-column/panel-add-column.component';
import { PanelAddWidgetComponent } from './views/panel-add-widget/panel-add-widget.component';
import { PanelChartToleranceBandComponent } from './views/panel-chart-tolerance-band/panel-chart-tolerance-band.component';
import { PanelColumnListComponent } from './views/panel-column-list/panel-column-list.component';
import { PanelColumnSettingsComponent } from './views/panel-column-settings/panel-column-settings.component';
import { PanelColumnToleranceComponent } from './views/panel-column-tolerance/panel-column-tolerance.component';
import { PanelIssuesComponent } from './views/panel-issues/panel-issues.component';
import { PanelReportFiltersComponent } from './views/panel-report-filters/panel-report-filters.component';
import { PanelReportSettingsComponent } from './views/panel-report-settings/panel-report-settings.component';
import { PanelRootComponent } from './views/panel-root/panel-root.component';
import { PanelTableAppearanceComponent } from './views/panel-table-appearance/panel-table-appearance.component';
import { PanelTextStyleComponent } from './views/panel-text-style/panel-text-style.component';
import { PanelWidgetDetailComponent } from './views/panel-widget-detail/panel-widget-detail.component';
import { PanelWidgetFiltersComponent } from './views/panel-widget-filters/panel-widget-filters.component';
import { PanelWidgetListComponent } from './views/panel-widget-list/panel-widget-list.component';

/**
 * The component shown for each side-panel view. This is the single place to wire a
 * new panel screen: because it's a `Record<PanelView['kind'], …>`, adding a member
 * to {@link PanelView} without registering its component is a compile error, and
 * the panel chrome renders whatever this maps to (see the host's `currentPanel`).
 *
 * Every panel component reads what it needs from the shared store, so none take
 * inputs — which is why the host can render them with a plain `NgComponentOutlet`.
 */
export const PANEL_COMPONENTS: Record<PanelView['kind'], Type<unknown>> = {
  root: PanelRootComponent,
  report: PanelReportSettingsComponent,
  widgets: PanelWidgetListComponent,
  widget: PanelWidgetDetailComponent,
  addWidget: PanelAddWidgetComponent,
  widgetColumns: PanelColumnListComponent,
  addColumn: PanelAddColumnComponent,
  columnSettings: PanelColumnSettingsComponent,
  columnTolerance: PanelColumnToleranceComponent,
  chartToleranceBand: PanelChartToleranceBandComponent,
  tableAppearance: PanelTableAppearanceComponent,
  textStyle: PanelTextStyleComponent,
  widgetFilters: PanelWidgetFiltersComponent,
  reportFilters: PanelReportFiltersComponent,
  issues: PanelIssuesComponent,
};
