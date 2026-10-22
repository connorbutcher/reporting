import { FilterGroup } from '../filter';
import { Aggregate } from './chart-config.model';
import { FormatRule } from './format-rule.model';
import { WidgetConfigBase } from './widget-base.model';

/** How a pivot measure reduces a group: the chart aggregates, plus a distinct count and a median. */
export type PivotAggregate = Aggregate | 'countDistinct' | 'median';

/** How a measure's value is shown: as itself, or as a share of its column's total or of its enclosing group. */
export type PivotShowAs = 'value' | 'percentOfTotal' | 'percentOfParent';

/** The period a date field is grouped into. */
export type DateGrouping = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Groups a date row or column field by period rather than by exact value. */
export type PivotFieldGrouping = {
  columnId: string;
  grouping: DateGrouping;
};

/**
 * One measure a pivot computes and shows as a value column: an aggregate over a column, reduced
 * within each group. `columnId` is null (and unused) for the `count` aggregate, which counts rows.
 */
export type PivotMeasure = {
  /** Client-generated, addresses this measure in the editor — not meaningful server-side. */
  id: string;
  /** The column reduced; null for `count`. */
  columnId: string | null;
  aggregate: PivotAggregate;
  /** Omitted shows the value itself. */
  showAs?: PivotShowAs;
  /** Overrides the derived column header (e.g. "Sum of Cost"); blank uses the derived one. */
  label: string;
  /** Draws a bar behind each value, scaled across the measure's values in the pivot. */
  dataBars?: boolean;
  /** Conditional highlighting, checked in order; the first rule a value matches wins. */
  formatRules?: FormatRule[];
};

/**
 * A pivot / aggregation table: rows are grouped by one or more dimension columns (`rowFields`) and
 * each group reduced to one or more measures (`measures`) — the tabular counterpart of the bar chart.
 */
export type PivotTableWidgetConfig = WidgetConfigBase & {
  type: 'pivotTable';

  /** Null until the user binds the pivot to a dataset. */
  datasetId: number | null;

  /** The columns rows are grouped by, in order — nested left to right. */
  rowFields: string[];

  /** The columns spread across the top, in order — one group of value columns per combination. Omitted means none. */
  columnFields?: string[];

  /** Date row/column fields grouped by period rather than by exact value. */
  fieldGroupings?: PivotFieldGrouping[];

  /** The measures computed for each group, each shown as its own value column. */
  measures: PivotMeasure[];

  /** The measure (by its {@link PivotMeasure.id}) the rows are ordered by; null orders by the dimensions. */
  sortMeasureId: string | null;
  /** Orders the measure sort highest-first when true. */
  sortDescending: boolean;

  /** Appends a totals row aggregating every matched row (and a totals column group with column fields). */
  showGrandTotal: boolean;

  /** With two or more row fields, adds a subtotal row heading each outer group, which readers can collapse. */
  showSubtotals?: boolean;

  /** Rows this widget aggregates, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;
};

export const DEFAULT_PIVOT_CONFIG: Omit<PivotTableWidgetConfig, 'type'> = {
  datasetId: null,
  title: 'Pivot table',
  showTitle: true,
  rowFields: [],
  columnFields: [],
  fieldGroupings: [],
  measures: [],
  sortMeasureId: null,
  sortDescending: true,
  showGrandTotal: true,
  showSubtotals: false,
  filter: null,
};
