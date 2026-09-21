import type { WidgetType } from '../report';
import { DatasetColumnType } from './schema.model';

export type ColumnUseKind = 'widget' | 'reportFilter';

/** One place in the report that refers to a dataset column — a widget, or the report's own page-level filter. */
export interface ColumnUse {
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
}

export interface ColumnUsage {
  columnId: string;
  uses: ColumnUse[];
}

/**
 * What changing a column to another type would newly break: only uses that work on its current type
 * but not the new one. Each break's `roles` say what stops working ("Value column needs a number").
 */
export interface ColumnTypeImpact {
  from: DatasetColumnType;
  to: DatasetColumnType;
  breaks: ColumnUse[];
}

/** Where a dataset's columns are used in the draft report that owns it; lists only columns that are used. */
export interface DatasetColumnUsage {
  columns: ColumnUsage[];
}
