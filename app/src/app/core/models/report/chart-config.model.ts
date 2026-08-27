import { FilterGroup } from '../filter';
import { WidgetConfigBase } from './widget-base.model';

/** How a bar chart reduces the many rows in one category down to a single bar height. */
export type Aggregate = 'sum' | 'average' | 'count' | 'min' | 'max';

export type ChartAxis = 'x' | 'y';

/**
 * Reference lines drawn on one axis, resolved against one row of a separate
 * limits dataset — the chart equivalent of a table column's ToleranceConfig.
 * A chart can carry several, e.g. one per spec being plotted.
 */
export interface ChartToleranceBand {
  /** Client-generated, only for addressing this band in the editor — not meaningful server-side. */
  id: string;
  axis: ChartAxis;
  sourceDatasetId: number;
  sourceRowId: string;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
  /** Shades the in-spec zone (and any concession shoulders) between the band's lines. */
  fill?: boolean;
  /** Outlines plotted points that fall outside the band's outermost line. */
  outlinePoints?: boolean;
}

/** A band is only usable — for a reference line or a tolerance filter — once it points at a spec. */
export function isCompleteToleranceBand(band: ChartToleranceBand): boolean {
  return !!(band.sourceDatasetId && band.sourceRowId && band.minColumnId && band.maxColumnId);
}

/**
 * The binding's axis columns a tolerance filter can key off: an axis column counts only when
 * exactly one complete band targets that axis, so "out of tolerance" resolves to a single spec —
 * mirroring how the server maps bands to axis columns.
 */
export function bandedChartColumns(
  bands: readonly ChartToleranceBand[],
  binding: { xColumnId: string | null; yColumnId: string | null },
): string[] {
  const complete = bands.filter(isCompleteToleranceBand);
  const columns: string[] = [];
  for (const [axis, columnId] of [
    ['x', binding.xColumnId],
    ['y', binding.yColumnId],
  ] as const) {
    if (columnId && complete.filter((b) => b.axis === axis).length === 1) columns.push(columnId);
  }
  return columns;
}

/** One extra field shown in a point's tooltip, beyond the X/Y values. */
export interface ChartTooltipColumn {
  columnId: string;
  prefix?: string;
  suffix?: string;
}

/**
 * One dataset's contribution to a chart: its axes, optional per-value split, and
 * row filter. A chart carries one or more of these; several overlaid on shared
 * axes is how two datasets are plotted against each other. Each binding is
 * queried on its own dataset and its series merged client-side.
 */
export interface ChartSeriesBinding {
  /** Client-generated, addresses this binding in the editor — not meaningful server-side. */
  id: string;
  /** Null until the user binds this series to a dataset. */
  datasetId: number | null;
  xColumnId: string | null;
  yColumnId: string | null;
  /** Splits this binding into a separate coloured series per distinct value. Null plots one. */
  seriesColumnId: string | null;
  /** Blank falls back to the dataset/column name in the legend. */
  label: string;
  /** Rows this binding plots, narrowed server-side. Null means no per-series filter. */
  filter: FilterGroup | null;
}

/**
 * Configuration common to every chart kind (scatter, line, and future bar/area).
 * Concrete kinds narrow `type` and add their own presentation options; everything
 * about data binding, tolerance bands, tooltips, and filtering is shared here.
 */
export interface ChartWidgetConfigBase extends WidgetConfigBase {
  /**
   * The datasets this chart overlays on its shared axes, each queried on its own
   * dataset. Always at least one entry. Prefer this over the deprecated flat
   * fields below; read both through {@link readChartBindings}.
   */
  bindings: ChartSeriesBinding[];

  /** Blank falls back to the bound column's own name. */
  xAxisLabel: string;
  yAxisLabel: string;

  showLegend: boolean;
  pointSize: number;

  /** Dashed reference lines for one or more specs plotted against an axis. */
  toleranceBands: ChartToleranceBand[];
  /** Extra fields shown in a point's tooltip, in order, beyond the X/Y values. */
  tooltipColumns: ChartTooltipColumn[];
}

/**
 * The pre-multi-dataset chart config shape: dataset, axes, and filter lived
 * directly on the config rather than on a binding. Still present in reports
 * saved before {@link ChartSeriesBinding} existed, so {@link readChartBindings}
 * folds it into a single binding. Never written any more.
 */
interface LegacyFlatChartConfig {
  datasetId?: number | null;
  xColumnId?: string | null;
  yColumnId?: string | null;
  seriesColumnId?: string | null;
  filter?: FilterGroup | null;
}

/** The binding id a legacy chart config folds into — stable so every reader agrees. */
const LEGACY_BINDING_ID = 'legacy-primary';

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

/**
 * A bar chart. Unlike scatter/line it doesn't plot raw rows: rows are grouped by
 * the category column (`xColumnId`) and each group's values in the measure column
 * (`yColumnId`) are reduced to one bar by `aggregate`. The measure is unused — and
 * may be left unbound — when `aggregate` is `'count'`, which counts rows.
 */
export interface BarChartWidgetConfig extends ChartWidgetConfigBase {
  type: 'barChart';

  aggregate: Aggregate;
  /** Stacks a category's series bars into one column instead of placing them side by side. */
  stacked: boolean;
  /** Draws bars horizontally (categories down the Y axis) rather than as vertical columns. */
  horizontal: boolean;
}

export type ChartWidgetConfig =
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig
  | BarChartWidgetConfig;

const DEFAULT_CHART_CONFIG_BASE: Omit<ChartWidgetConfigBase, 'type' | 'title'> = {
  showTitle: true,
  // A fresh chart starts with no bindings; the model seeds an empty one so the
  // panel has a row to bind.
  bindings: [],
  xAxisLabel: '',
  yAxisLabel: '',
  showLegend: true,
  pointSize: 8,
  toleranceBands: [],
  tooltipColumns: [],
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

export const DEFAULT_BAR_CHART_CONFIG: Omit<BarChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Bar chart',
  aggregate: 'sum',
  stacked: false,
  horizontal: false,
};

/** A blank series binding; the id is filled in per instance. */
export const EMPTY_CHART_BINDING: Omit<ChartSeriesBinding, 'id'> = {
  datasetId: null,
  xColumnId: null,
  yColumnId: null,
  seriesColumnId: null,
  label: '',
  filter: null,
};

/**
 * The chart's series bindings, normalised: prefers the {@link ChartSeriesBinding}
 * list, and for reports saved before the multi-dataset change folds the deprecated
 * flat `datasetId`/`xColumnId`/… fields into a single binding. Always returns at
 * least one binding so callers never special-case the empty case.
 */
export function readChartBindings(config: ChartWidgetConfigBase): ChartSeriesBinding[] {
  // `bindings` is required on the type but genuinely absent from reports persisted
  // before it existed, so this read must tolerate `undefined`, not just an empty array.
  if (config.bindings?.length) return config.bindings;

  // A report saved before bindings existed carries its axes on the flat legacy
  // fields; fold them into one binding. New configs always have `bindings`.
  //
  // The id is a fixed constant, not a fresh uuid: several call sites fold the same
  // raw legacy DTO independently (the viewer resolves filters, keys the reader
  // panel, and queries from three separate reads), and they must agree on the
  // binding's id for the per-binding filter map to line up. One binding per legacy
  // chart means a constant can't collide within a widget.
  const legacy = config as LegacyFlatChartConfig;
  return [
    {
      id: LEGACY_BINDING_ID,
      datasetId: legacy.datasetId ?? null,
      xColumnId: legacy.xColumnId ?? null,
      yColumnId: legacy.yColumnId ?? null,
      seriesColumnId: legacy.seriesColumnId ?? null,
      label: '',
      filter: legacy.filter ?? null,
    },
  ];
}
