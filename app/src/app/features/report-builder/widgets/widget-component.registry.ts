import { Type } from '@angular/core';
import { WidgetType } from '../../../core/models/report';
import { ChartWidgetComponent } from './chart-widget/chart-widget.component';
import { DataTableWidgetComponent } from './data-table-widget/data-table-widget.component';
import { KpiWidgetComponent } from './kpi-widget/kpi-widget.component';
import { PivotTableWidgetComponent } from './pivot-table-widget/pivot-table-widget.component';
import { StaticTextWidgetComponent } from './static-text-widget/static-text-widget.component';

export class WidgetComponentRegistry {
  /** The component per widget type. Being a `Record`, a new {@link WidgetType} must be registered here. */
  public static readonly COMPONENTS: Record<WidgetType, Type<unknown>> = {
    dataTable: DataTableWidgetComponent,
    pivotTable: PivotTableWidgetComponent,
    kpi: KpiWidgetComponent,
    staticText: StaticTextWidgetComponent,
    scatterChart: ChartWidgetComponent,
    lineChart: ChartWidgetComponent,
    barChart: ChartWidgetComponent,
    comboChart: ChartWidgetComponent,
    boxPlot: ChartWidgetComponent,
    histogram: ChartWidgetComponent,
    xbarRChart: ChartWidgetComponent,
  };
}
