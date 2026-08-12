import { FilterGroup, ReportFilter } from './filter.model';

export type WidgetType = 'dataTable' | 'staticText' | 'scatterChart' | 'lineChart';

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
  /** Pass/fail highlighting for this column's values. Omitted shows no banding. */
  tolerance?: ToleranceConfig;
}

/**
 * Red/amber banding for a numeric column, resolved against one row of a
 * separate limits dataset so the same spec can be reused across columns and
 * reports. Min/Max is the in-spec range; the optional concession bounds
 * widen it into an amber "needs sign-off" zone before a value goes red.
 */
export interface ToleranceConfig {
  sourceDatasetId: string;
  sourceRowId: string;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
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

  /** Rows this widget shows, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;
}

export type ChartAxis = 'x' | 'y';

/**
 * Reference lines drawn on one axis, resolved against one row of a separate
 * limits dataset — the chart equivalent of a table column's {@link ToleranceConfig}.
 * A chart can carry several, e.g. one per spec being plotted.
 */
export interface ChartToleranceBand {
  /** Client-generated, only for addressing this band in the editor — not meaningful server-side. */
  id: string;
  axis: ChartAxis;
  sourceDatasetId: string;
  sourceRowId: string;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
}

/** One extra field shown in a point's tooltip, beyond the X/Y values. */
export interface ChartTooltipColumn {
  columnId: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Configuration common to every chart kind (scatter, line, and future bar/area).
 * Concrete kinds narrow `type` and add their own presentation options; everything
 * about data binding, tolerance bands, tooltips, and filtering is shared here.
 */
export interface ChartWidgetConfigBase extends WidgetConfigBase {
  /** Null until the user binds the chart to a dataset. */
  datasetId: string | null;
  xColumnId: string | null;
  yColumnId: string | null;
  /** Splits points into a separate coloured series per distinct value. Null plots one series. */
  seriesColumnId: string | null;

  /** Blank falls back to the bound column's own name. */
  xAxisLabel: string;
  yAxisLabel: string;

  showLegend: boolean;
  pointSize: number;

  /** Dashed reference lines for one or more specs plotted against an axis. */
  toleranceBands: ChartToleranceBand[];
  /** Extra fields shown in a point's tooltip, in order, beyond the X/Y values. */
  tooltipColumns: ChartTooltipColumn[];

  /** Rows this chart plots, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;
}

export interface ScatterChartWidgetConfig extends ChartWidgetConfigBase {
  type: 'scatterChart';
}

export interface LineChartWidgetConfig extends ChartWidgetConfigBase {
  type: 'lineChart';

  /** Draws the line with curved rather than straight segments. */
  smooth: boolean;
  /** Whether point markers are drawn along the line. */
  showPoints: boolean;
  /** Shades the area under the line. */
  areaFill: boolean;
}

export type ChartWidgetConfig = ScatterChartWidgetConfig | LineChartWidgetConfig;

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

export type WidgetConfig =
  | DataTableWidgetConfig
  | StaticTextWidgetConfig
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig;

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

export interface ScatterChartWidget extends WidgetBase {
  type: 'scatterChart';
  config: ScatterChartWidgetConfig;
}

export interface LineChartWidget extends WidgetBase {
  type: 'lineChart';
  config: LineChartWidgetConfig;
}

/** Every chart kind, for code that treats charts uniformly. */
export type ChartWidget = ScatterChartWidget | LineChartWidget;

export type Widget = DataTableWidget | StaticTextWidget | ScatterChartWidget | LineChartWidget;

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
  /** Report-level filters, one per dataset, applied on top of each widget's own. */
  filters: ReportFilter[];
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
  filter: null,
};

const DEFAULT_CHART_CONFIG_BASE: Omit<ChartWidgetConfigBase, 'type' | 'title'> = {
  showTitle: true,
  datasetId: null,
  xColumnId: null,
  yColumnId: null,
  seriesColumnId: null,
  xAxisLabel: '',
  yAxisLabel: '',
  showLegend: true,
  pointSize: 8,
  toleranceBands: [],
  tooltipColumns: [],
  filter: null,
};

export const DEFAULT_SCATTER_CHART_CONFIG: Omit<ScatterChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Scatter chart',
};

export const DEFAULT_LINE_CHART_CONFIG: Omit<LineChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Line chart',
  smooth: false,
  showPoints: true,
  areaFill: false,
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
