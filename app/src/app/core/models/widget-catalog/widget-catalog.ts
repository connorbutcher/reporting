import { WidgetGroupInfo } from './widget-group-info.model';
import { WidgetTypeDescriptor } from './widget-type-descriptor.model';
import { ChartWidget, Widget, WidgetType } from '../report';

/** Each widget type's label, icon, hint and group. */
export class WidgetCatalog {
  private static readonly GROUPS: readonly WidgetGroupInfo[] = [
    { id: 'data', label: 'Data', order: 0 },
    { id: 'chart', label: 'Chart', order: 1 },
    { id: 'text', label: 'Static Content', order: 2 },
  ];

  private static readonly TYPES: readonly WidgetTypeDescriptor[] = [
    {
      type: 'dataTable',
      label: 'Table',
      hint: 'Rows and columns from a dataset',
      icon: 'pi pi-table',
      group: 'data',
    },
    {
      type: 'pivotTable',
      label: 'Pivot table',
      hint: 'Group rows and summarise columns',
      icon: 'pi pi-objects-column',
      group: 'data',
    },
    {
      type: 'kpi',
      label: 'KPI',
      hint: 'Summarise data into one key number',
      icon: 'pi pi-gauge',
      group: 'data',
    },
    {
      type: 'scatterChart',
      label: 'Scatter chart',
      hint: 'Plot two columns as points',
      icon: 'pi pi-chart-scatter',
      group: 'chart',
    },
    {
      type: 'lineChart',
      label: 'Line chart',
      hint: 'Plot two columns as a line',
      icon: 'pi pi-chart-line',
      group: 'chart',
    },
    {
      type: 'barChart',
      label: 'Bar chart',
      hint: 'Summarise a column into bars',
      icon: 'pi pi-chart-bar',
      group: 'chart',
    },
    {
      type: 'comboChart',
      label: 'Combination chart',
      hint: 'Summarise columns as bars and lines together',
      icon: 'pi pi-chart-bar',
      group: 'chart',
    },
    {
      type: 'boxPlot',
      label: 'Box plot',
      hint: 'Summarise a column’s spread per category',
      icon: 'pi pi-chart-bar',
      group: 'chart',
    },
    {
      type: 'histogram',
      label: 'Histogram',
      hint: 'Show how one column’s values are distributed',
      icon: 'pi pi-chart-bar',
      group: 'chart',
    },
    {
      type: 'xbarRChart',
      label: 'Xbar-R chart',
      hint: 'Monitor a process’s mean and spread over time against control limits',
      icon: 'pi pi-wave-pulse',
      group: 'chart',
    },
    {
      type: 'staticText',
      label: 'Text',
      hint: 'A styled heading or block of text',
      icon: 'pi pi-align-left',
      group: 'text',
    },
  ];

  private static readonly BY_TYPE = new Map(WidgetCatalog.TYPES.map((d) => [d.type, d]));

  public static descriptor(type: WidgetType): WidgetTypeDescriptor {
    const descriptor = WidgetCatalog.BY_TYPE.get(type);
    if (!descriptor) {
      throw new Error(`Unknown widget type: ${type}`);
    }
    return descriptor;
  }

  /** For the add-widget menu, in group display order. */
  public static typesByGroup(): {
    group: WidgetGroupInfo;
    types: WidgetTypeDescriptor[];
  }[] {
    return [...WidgetCatalog.GROUPS]
      .sort((a, b) => a.order - b.order)
      .map((group) => ({
        group,
        types: WidgetCatalog.TYPES.filter((d) => d.group === group.id),
      }))
      .filter((entry) => entry.types.length > 0);
  }

  /** Charts, tables and pivots can be downloaded as a screenshot or CSV. */
  public static isExportableType(type: WidgetType): boolean {
    return WidgetCatalog.isChartType(type) || type === 'dataTable' || type === 'pivotTable';
  }

  public static isChartWidget(widget: Widget): widget is ChartWidget {
    return WidgetCatalog.isChartType(widget.type);
  }

  private static isChartType(type: WidgetType): boolean {
    return WidgetCatalog.descriptor(type).group === 'chart';
  }
}
