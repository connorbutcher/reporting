import { ColumnUse } from '../../../core/models/dataset';
import { ColumnUseLine } from './column-use-line';
import { WidgetCatalog } from '../../../core/models/widget-catalog/widget-catalog';

/** How a column's uses read in the columns panel and the delete confirmation. */
export class ColumnUsageDisplay {
  public static describe(use: ColumnUse): ColumnUseLine {
    const roles = use.roles.join(', ');
    if (use.kind === 'reportFilter' || !use.widgetType) {
      return { widgetId: null, name: 'Report filter', where: '', roles, icon: 'pi pi-filter' };
    }

    const descriptor = WidgetCatalog.descriptor(use.widgetType);
    return {
      widgetId: use.widgetId,
      name: use.widgetTitle?.trim() || `Untitled ${descriptor.label.toLowerCase()}`,
      where: [descriptor.label, use.tabName].filter((part) => !!part).join(' · '),
      roles,
      icon: descriptor.icon,
    };
  }

  /** "Used in 2 widgets", "Used in 1 widget and the report filter", "Used in the report filter". */
  public static summarise(uses: readonly ColumnUse[]): string {
    const widgets = uses.filter((u) => u.kind === 'widget').length;
    const filter = uses.some((u) => u.kind === 'reportFilter');
    const parts = [
      ...(widgets > 0 ? [`${widgets} widget${widgets === 1 ? '' : 's'}`] : []),
      ...(filter ? ['the report filter'] : []),
    ];
    return parts.length > 0 ? `Used in ${parts.join(' and ')}` : 'Not used';
  }

  /** One line per use, for the delete confirmation: "Sales log (Table · Overview) — Table column, Sort column". */
  public static details(uses: readonly ColumnUse[]): string[] {
    return uses.map((use) => {
      const line = ColumnUsageDisplay.describe(use);
      return `${line.name}${line.where ? ` (${line.where})` : ''} — ${line.roles}`;
    });
  }
}
