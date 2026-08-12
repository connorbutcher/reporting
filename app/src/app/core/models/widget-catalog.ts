import { ChartWidget, Widget, WidgetType } from './report.model';

/**
 * The catalogue of widget types the builder can place — the single source of
 * each type's label, icon, hint, and grouping. Adding a new widget (e.g. a bar
 * or area chart) means adding one row here plus its config/model, with no
 * changes to the add-widget menu, the widget list, or the detail header.
 */

/** Category a widget type belongs to, used to group the add-widget menu. */
export type WidgetGroup = 'data' | 'text' | 'chart';

export interface WidgetGroupInfo {
  id: WidgetGroup;
  label: string;
  /** Display order of the group in the add-widget menu. */
  order: number;
}

export interface WidgetTypeDescriptor {
  type: WidgetType;
  label: string;
  /** One-line description shown under the label in the add-widget menu. */
  hint: string;
  /** PrimeIcons class, e.g. 'pi pi-chart-scatter'. */
  icon: string;
  group: WidgetGroup;
}

export const WIDGET_GROUPS: readonly WidgetGroupInfo[] = [
  { id: 'data', label: 'Data', order: 0 },
  { id: 'chart', label: 'Chart', order: 1 },
  { id: 'text', label: 'Static Content', order: 2 },
];

export const WIDGET_TYPES: readonly WidgetTypeDescriptor[] = [
  {
    type: 'dataTable',
    label: 'Table',
    hint: 'Rows and columns from a dataset',
    icon: 'pi pi-table',
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
    type: 'staticText',
    label: 'Text',
    hint: 'A styled heading or block of text',
    icon: 'pi pi-align-left',
    group: 'text',
  },
];

const DESCRIPTORS_BY_TYPE = new Map(WIDGET_TYPES.map((d) => [d.type, d]));

export function widgetTypeDescriptor(type: WidgetType): WidgetTypeDescriptor {
  const descriptor = DESCRIPTORS_BY_TYPE.get(type);
  if (!descriptor) throw new Error(`Unknown widget type: ${type}`);
  return descriptor;
}

/** The widget types, bucketed by group in display order, for the add-widget menu. */
export function widgetTypesByGroup(): {
  group: WidgetGroupInfo;
  types: WidgetTypeDescriptor[];
}[] {
  return [...WIDGET_GROUPS]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      group,
      types: WIDGET_TYPES.filter((d) => d.group === group.id),
    }))
    .filter((entry) => entry.types.length > 0);
}

/** Whether a widget type is a chart kind — the code path shared by scatter, line, and future charts. */
export function isChartWidgetType(type: WidgetType): boolean {
  return widgetTypeDescriptor(type).group === 'chart';
}

/** Narrows a widget to a chart kind, so callers can reach the shared chart config fields. */
export function isChartWidget(widget: Widget): widget is ChartWidget {
  return isChartWidgetType(widget.type);
}
