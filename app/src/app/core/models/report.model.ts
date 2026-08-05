export type WidgetType = 'dataTable' | 'staticText';

export type SortDirection = 'asc' | 'desc';
export type ColumnAlign = 'left' | 'center' | 'right';
export type TableDensity = 'compact' | 'normal' | 'comfortable';

export type TextFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';

/** A column placed on the table, in display order. */
export interface DataTableColumnSetting {
  columnId: string;
  /** Overrides the dataset column's name in the header. */
  header?: string;
  /** Pixel width kept after the user resizes the column. */
  width?: number;
  /** Omitted falls back to right for numbers, left otherwise. */
  align?: ColumnAlign;
  sortable?: boolean;
}

/** Fields every widget config carries, regardless of type. */
interface WidgetConfigBase {
  title: string;
  showTitle: boolean;
}

export interface DataTableWidgetConfig extends WidgetConfigBase {
  type: 'dataTable';
  /** Null until the user binds the table to a dataset. */
  datasetId: string | null;

  showColumnHeaders: boolean;

  resizableColumns: boolean;
  stripedRows: boolean;
  showGridlines: boolean;
  rowHover: boolean;
  density: TableDensity;

  paginator: boolean;
  rowsPerPage: number;

  emptyMessage: string;

  /** Columns on the table. Empty means "every dataset column, in dataset order". */
  columns: DataTableColumnSetting[];

  sortColumnId: string | null;
  sortDirection: SortDirection;
}

export interface StaticTextWidgetConfig extends WidgetConfigBase {
  type: 'staticText';

  /** Plain text; line breaks are preserved, never rendered as HTML. */
  content: string;

  fontSize: number;
  fontWeight: TextFontWeight;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  lineHeight: number;

  color: string;
  /** Null means transparent. */
  backgroundColor: string | null;

  textAlign: TextAlign;
  verticalAlign: TextVerticalAlign;
  /** False lets long lines overflow with a scrollbar instead of wrapping. */
  wrap: boolean;
  padding: number;
}

export type WidgetConfig = DataTableWidgetConfig | StaticTextWidgetConfig;

interface WidgetBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A discriminated union on `type`, so narrowing `type` also narrows `config`
 * to the matching shape (e.g. inside a `switch (widget.type)` or after a
 * `widget.type === 'dataTable'` check).
 */
export interface DataTableWidget extends WidgetBase {
  type: 'dataTable';
  config: DataTableWidgetConfig;
}

export interface StaticTextWidget extends WidgetBase {
  type: 'staticText';
  config: StaticTextWidgetConfig;
}

export type Widget = DataTableWidget | StaticTextWidget;

/** A report's identity and folder placement — everything except its content. */
export interface ReportSummary {
  id: string;
  number: number;
  name: string;
  folderId: string | null;
  hasDraft: boolean;
  latestVersionNumber: number | null;
  modifiedAt: string;
}

/** The content of one revision of a report — either the checked-out draft or one published version. */
export interface ReportRevisionContent {
  reportId: string;
  name: string;
  columns: number;
  rows: number;
  widgets: Widget[];
  /** Rich-text (HTML) description of what changed. Null for drafts. */
  notes: string | null;
}

export interface ReportVersionSummary {
  versionNumber: number;
  publishedAt: string;
  /** Rich-text (HTML) description of what changed in this version, entered when publishing. */
  notes: string | null;
}

/** A report match from a name/number search, with its folder location for display. */
export interface ReportSearchResult {
  id: string;
  number: number;
  name: string;
  hasDraft: boolean;
  latestVersionNumber: number | null;
  modifiedAt: string;
  folderPath: string;
}

export const DEFAULT_TABLE_CONFIG: Omit<DataTableWidgetConfig, 'type'> = {
  datasetId: null,
  title: 'Table',
  showTitle: true,
  showColumnHeaders: true,
  resizableColumns: false,
  stripedRows: false,
  showGridlines: false,
  rowHover: true,
  density: 'compact',
  paginator: false,
  rowsPerPage: 10,
  emptyMessage: 'No rows to display.',
  columns: [],
  sortColumnId: null,
  sortDirection: 'asc',
};

export const DEFAULT_TEXT_CONFIG: Omit<StaticTextWidgetConfig, 'type'> = {
  title: 'Text',
  // The text itself is usually the whole point of the widget, so the extra
  // chrome bar stays off until the user asks for it.
  showTitle: false,
  content: '',
  fontSize: 16,
  fontWeight: 'normal',
  italic: false,
  underline: false,
  strikethrough: false,
  lineHeight: 1.4,
  color: '#1f2937',
  backgroundColor: null,
  textAlign: 'left',
  verticalAlign: 'top',
  wrap: true,
  padding: 12,
};
