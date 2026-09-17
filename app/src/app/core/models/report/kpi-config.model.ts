import { FilterGroup } from '../filter';
import { NumericColumnConfig } from '../dataset';
import { Aggregate } from './chart-config.model';
import { WidgetConfigBase } from './widget-base.model';

/**
 * One named aggregate a KPI's formula can reference: a measure over a column (or a row count),
 * narrowed by its own optional filter in addition to the widget's base filter — e.g. an alias
 * `OverLimit` counting rows where a column exceeds a value. `columnId` is null (and unused) for
 * the `count` aggregate, which counts rows.
 */
export interface KpiMeasure {
  /** Client-generated, addresses this measure in the editor — not meaningful server-side. */
  id: string;
  /** The name the formula references this measure by, e.g. `[OverLimit]`. */
  alias: string;
  /** The column reduced; null for `count`. */
  columnId: string | null;
  aggregate: Aggregate;
  /** Narrows the rows this one measure reduces, ANDed with the widget's base filter. */
  filter: FilterGroup | null;
}

/** Literal numeric bounds a KPI's value is judged against, for tile coloring. */
export interface KpiThreshold {
  lowerBound: number | null;
  upperBound: number | null;
  /** When true, a value outside the bounds is "good" instead of inside them. */
  invertColors: boolean;
}

export type KpiComparisonDirection = 'neutral' | 'higherIsBetter' | 'lowerIsBetter';

/**
 * A single headline number: one or more named `measures` aggregated over a filtered dataset and
 * combined by `formula`, optionally compared against a second filter and colored against a
 * threshold — the report builder's "big number" tile.
 */
export interface KpiWidgetConfig extends WidgetConfigBase {
  type: 'kpi';

  /** Null until the user binds the widget to a dataset. */
  datasetId: number | null;

  /** Rows this widget aggregates, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;

  /** The named aggregates the formula can combine. */
  measures: KpiMeasure[];

  /**
   * An expression over the measures' aliases, e.g. `[OverLimit] / [Total] * 100`. Blank defaults
   * to the sole measure's value when there's exactly one.
   */
  formula: string;

  /**
   * When set, the same measures and formula are computed a second time with this filter in place
   * of `filter`, giving a comparison value the widget shows as a trend/delta.
   */
  comparisonFilter: FilterGroup | null;

  /** Whether a higher, lower, or neither comparison value colors the trend as an improvement. */
  comparisonDirection: KpiComparisonDirection;

  threshold: KpiThreshold | null;

  numberFormat: NumericColumnConfig | null;
}

export const DEFAULT_KPI_CONFIG: Omit<KpiWidgetConfig, 'type'> = {
  datasetId: null,
  title: 'KPI',
  showTitle: true,
  filter: null,
  measures: [],
  formula: '',
  comparisonFilter: null,
  comparisonDirection: 'neutral',
  threshold: null,
  numberFormat: null,
};
