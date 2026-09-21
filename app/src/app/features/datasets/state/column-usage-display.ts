import { ColumnUse } from '../../../core/models/dataset';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';

/** How one use reads in the columns panel and in the delete confirmation. */
export interface ColumnUseLine {
  /** The widget to open in the builder; null for the report filter. */
  widgetId: string | null;
  /** The widget's title, or its type when untitled — or "Report filter". */
  name: string;
  /** Where it sits: "Table · Overview" (blank for a report filter). */
  where: string;
  /** How it uses the column: "Table column, Filter condition ×2". */
  roles: string;
  /** PrimeIcons class for the widget's type. */
  icon: string;
}

export function describeUse(use: ColumnUse): ColumnUseLine {
  const roles = use.roles.join(', ');
  if (use.kind === 'reportFilter' || !use.widgetType) {
    return { widgetId: null, name: 'Report filter', where: '', roles, icon: 'pi pi-filter' };
  }

  const descriptor = widgetTypeDescriptor(use.widgetType);
  return {
    widgetId: use.widgetId,
    name: use.widgetTitle?.trim() || `Untitled ${descriptor.label.toLowerCase()}`,
    where: [descriptor.label, use.tabName].filter((part) => !!part).join(' · '),
    roles,
    icon: descriptor.icon,
  };
}

/** "Used in 2 widgets", "Used in 1 widget and the report filter", "Used in the report filter". */
export function summariseUses(uses: readonly ColumnUse[]): string {
  const widgets = uses.filter((u) => u.kind === 'widget').length;
  const filter = uses.some((u) => u.kind === 'reportFilter');
  const parts = [
    ...(widgets > 0 ? [`${widgets} widget${widgets === 1 ? '' : 's'}`] : []),
    ...(filter ? ['the report filter'] : []),
  ];
  return parts.length > 0 ? `Used in ${parts.join(' and ')}` : 'Not used';
}

/** One line per use, for the delete confirmation: "Sales log (Table · Overview) — Table column, Sort column". */
export function useDetails(uses: readonly ColumnUse[]): string[] {
  return uses.map((use) => {
    const line = describeUse(use);
    return `${line.name}${line.where ? ` (${line.where})` : ''} — ${line.roles}`;
  });
}
