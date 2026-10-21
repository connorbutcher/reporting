import { PanelView } from './panel-view';
import { PanelAddColumnComponent } from './views/panel-add-column/panel-add-column.component';
import { PanelAddWidgetComponent } from './views/panel-add-widget/panel-add-widget.component';
import { PanelChartAxisComponent } from './views/panel-chart-axis/panel-chart-axis.component';
import { PanelChartGuideLineComponent } from './views/panel-chart-guide-line/panel-chart-guide-line.component';
import { PanelChartSeriesComponent } from './views/panel-chart-series/panel-chart-series.component';
import { PanelChartToleranceBandComponent } from './views/panel-chart-tolerance-band/panel-chart-tolerance-band.component';
import { PanelColumnListComponent } from './views/panel-column-list/panel-column-list.component';
import { PanelColumnSettingsComponent } from './views/panel-column-settings/panel-column-settings.component';
import { PanelColumnToleranceComponent } from './views/panel-column-tolerance/panel-column-tolerance.component';
import { PanelIssuesComponent } from './views/panel-issues/panel-issues.component';
import { PanelWidgetDetailKpiToleranceComponent } from './views/panel-widget-detail-kpi-tolerance/panel-widget-detail-kpi-tolerance.component';
import { PanelReportFiltersComponent } from './views/panel-report-filters/panel-report-filters.component';
import { PanelReportSettingsComponent } from './views/panel-report-settings/panel-report-settings.component';
import { PanelRootComponent } from './views/panel-root/panel-root.component';
import { PanelTableAppearanceComponent } from './views/panel-table-appearance/panel-table-appearance.component';
import { PanelTextStyleComponent } from './views/panel-text-style/panel-text-style.component';
import { PanelWidgetDetailComponent } from './views/panel-widget-detail/panel-widget-detail.component';
import { PanelWidgetFiltersComponent } from './views/panel-widget-filters/panel-widget-filters.component';
import { PanelWidgetListComponent } from './views/panel-widget-list/panel-widget-list.component';
import { PanelComponentType } from './registry/panel-component-type';
import { ViewOf } from './registry/view-of';
import { PanelDescriptor } from './registry/panel-descriptor';

export class PanelComponentRegistry {
  /**
   * The single place to wire a new side-panel screen. As a mapped type over every
   * `PanelView['kind']`, adding a member to {@link PanelView} without a row here is
   * a compile error, and each row's `parent` is type-checked against its own view
   * (so `columnSettings` can read `view.columnId`, while `root` has no such field).
   *
   * Every panel component reads what it needs from the shared store, so none take
   * inputs — which is why the chrome can render them with a plain `NgComponentOutlet`.
   */
  public static readonly VIEWS: { readonly [K in PanelView['kind']]: PanelDescriptor<K> } = {
    root: { component: PanelRootComponent, parent: () => null },
    report: { component: PanelReportSettingsComponent, parent: () => ({ kind: 'root' }) },
    widgets: { component: PanelWidgetListComponent, parent: () => ({ kind: 'root' }) },
    addWidget: { component: PanelAddWidgetComponent, parent: () => ({ kind: 'root' }) },
    reportFilters: { component: PanelReportFiltersComponent, parent: () => ({ kind: 'root' }) },
    issues: { component: PanelIssuesComponent, parent: () => ({ kind: 'root' }) },
    widget: { component: PanelWidgetDetailComponent, parent: () => ({ kind: 'widgets' }) },
    widgetColumns: {
      component: PanelColumnListComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
    tableAppearance: {
      component: PanelTableAppearanceComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
    textStyle: {
      component: PanelTextStyleComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
    widgetFilters: {
      component: PanelWidgetFiltersComponent,
      // A chart binding's filters sit under that series' screen; a table's under the widget.
      parent: (view) =>
        view.bindingId
          ? { kind: 'chartSeries', widgetId: view.widgetId, bindingId: view.bindingId }
          : { kind: 'widget', widgetId: view.widgetId },
    },
    chartSeries: {
      component: PanelChartSeriesComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
    chartAxis: {
      component: PanelChartAxisComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
    chartToleranceBand: {
      component: PanelChartToleranceBandComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
    chartGuideLine: {
      component: PanelChartGuideLineComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
    addColumn: {
      component: PanelAddColumnComponent,
      parent: (view) => ({ kind: 'widgetColumns', widgetId: view.widgetId }),
    },
    columnSettings: {
      component: PanelColumnSettingsComponent,
      parent: (view) => ({ kind: 'widgetColumns', widgetId: view.widgetId }),
    },
    columnTolerance: {
      component: PanelColumnToleranceComponent,
      parent: (view) => ({
        kind: 'columnSettings',
        widgetId: view.widgetId,
        columnId: view.columnId,
      }),
    },
    kpiTolerance: {
      component: PanelWidgetDetailKpiToleranceComponent,
      parent: (view) => ({ kind: 'widget', widgetId: view.widgetId }),
    },
  };

  /** The component that renders a view. */
  public static componentFor(view: PanelView): PanelComponentType {
    return PanelComponentRegistry.VIEWS[view.kind].component;
  }

  /**
   * The view one step up the breadcrumb hierarchy, or null at the root. The generic
   * key keeps each view correlated with its own descriptor, so no cast is needed to
   * hand `view` to the matching `parent`.
   */
  public static parentOf<K extends PanelView['kind']>(view: ViewOf<K>): PanelView | null {
    return PanelComponentRegistry.VIEWS[view.kind].parent(view);
  }
}
