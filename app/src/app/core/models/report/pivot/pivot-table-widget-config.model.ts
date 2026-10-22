import { WidgetConfigBase } from '../widget/widget-config-base.model';
import { PivotFieldGrouping } from './pivot-field-grouping.model';
import { PivotMeasure } from './pivot-measure.model';
import { FilterGroup } from '../../filter';

/** Rows grouped by `rowFields`, each reduced to `measures`. */
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
