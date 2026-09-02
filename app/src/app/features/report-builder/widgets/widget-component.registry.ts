import { Type } from '@angular/core';
import { WidgetType } from '../../../core/models/report';
import { ChartWidgetComponent } from './chart-widget/chart-widget.component';
import { DataTableWidgetComponent } from './data-table-widget/data-table-widget.component';
import { StaticTextWidgetComponent } from './static-text-widget/static-text-widget.component';

/**
 * The component that renders each widget type. This is the single place to wire a
 * new widget kind: because it's a `Record<WidgetType, …>`, adding a member to
 * {@link WidgetType} without registering it here is a compile error, and nothing
 * that renders widgets (see {@link WidgetOutletDirective}) needs to change.
 */
export const WIDGET_COMPONENTS: Record<WidgetType, Type<unknown>> = {
  dataTable: DataTableWidgetComponent,
  staticText: StaticTextWidgetComponent,
  scatterChart: ChartWidgetComponent,
  lineChart: ChartWidgetComponent,
  barChart: ChartWidgetComponent,
  boxPlot: ChartWidgetComponent,
};
