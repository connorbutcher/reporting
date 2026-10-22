import { ColumnAlign } from './column-align.model';
import { ToleranceConfig } from './tolerance-config.model';
import { Aggregate } from '../chart/aggregate.model';
import { FormatRule } from '../format-rule/format-rule.model';

/** A column placed on the table, in display order. */
export type DataTableColumnSetting = {
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
  /** The aggregate shown for this column in the totals row. Omitted leaves its total blank. */
  total?: Aggregate | null;
  /** Wraps long values onto more lines instead of clipping them to one. */
  wrap?: boolean;
  /** Draws a bar behind each numeric value, scaled between the column's min and max. */
  dataBars?: boolean;
  /** Conditional highlighting, checked in order; the first rule a value matches wins. */
  formatRules?: FormatRule[];
};
