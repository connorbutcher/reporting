import { PivotAggregate } from './pivot-aggregate.model';
import { PivotShowAs } from './pivot-show-as.model';
import { FormatRule } from '../format-rule/format-rule.model';

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
