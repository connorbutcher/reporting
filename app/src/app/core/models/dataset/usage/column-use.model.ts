import { ColumnUseKind } from './column-use-kind.model';
import type { WidgetType } from '../../report';

/** One place in the report that refers to a dataset column — a widget, or the report's own page-level filter. */
export type ColumnUse = {
  kind: ColumnUseKind;
  /** The widget's id; null for a report-level filter. */
  widgetId: string | null;
  /** The widget's own title, possibly blank; null for a report-level filter. */
  widgetTitle: string | null;
  widgetType: WidgetType | null;
  /** The tab the widget sits on; null for a report-level filter. */
  tabName: string | null;
  /** How the column is used, e.g. "Table column", "Filter condition ×2". Never empty. */
  roles: string[];
};
