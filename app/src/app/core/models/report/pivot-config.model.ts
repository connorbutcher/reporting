import { FilterGroup } from '../filter';
import { Aggregate } from './chart-config.model';
import { WidgetConfigBase } from './widget-base.model';

/**
 * One measure a pivot computes and shows as a value column: an aggregate over a column, reduced
 * within each group. `columnId` is null (and unused) for the `count` aggregate, which counts rows.
 */
export interface PivotMeasure {
  /** Client-generated, addresses this measure in the editor — not meaningful server-side. */
  id: string;
  /** The column reduced; null for `count`. */
  columnId: string | null;
  aggregate: Aggregate;
  /** Overrides the derived column header (e.g. "Sum of Cost"); blank uses the derived one. */
  label: string;
}

/**
 * A pivot / aggregation table: rows are grouped by one or more dimension columns (`rowFields`) and
 * each group reduced to one or more measures (`measures`) — the tabular counterpart of the bar chart.
 */
export interface PivotTableWidgetConfig extends WidgetConfigBase {
  type: 'pivotTable';

  /** Null until the user binds the pivot to a dataset. */
  datasetId: number | null;

  /** The columns rows are grouped by, in order — nested left to right. */
  rowFields: string[];

  /** The measures computed for each group, each shown as its own value column. */
  measures: PivotMeasure[];

  /** The measure (by its {@link PivotMeasure.id}) the rows are ordered by; null orders by the dimensions. */
  sortMeasureId: string | null;
  /** Orders the measure sort highest-first when true. */
  sortDescending: boolean;

  /** Appends a totals row aggregating every matched row. */
  showGrandTotal: boolean;

  /** Rows this widget aggregates, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;
}

export const DEFAULT_PIVOT_CONFIG: Omit<PivotTableWidgetConfig, 'type'> = {
  datasetId: null,
  title: 'Pivot table',
  showTitle: true,
  rowFields: [],
  measures: [],
  sortMeasureId: null,
  sortDescending: true,
  showGrandTotal: true,
  filter: null,
};
