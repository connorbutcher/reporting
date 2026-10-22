import { DatasetColumn } from '../../../../core/models/dataset';
import { Aggregate, ColumnAlign, FormatRule } from '../../../../core/models/report';

/** A dataset column paired with the widget's settings for it. */
export type DisplayColumn = {
  column: DatasetColumn;
  header: string;
  align: ColumnAlign;
  sortable: boolean;
  width?: number;
  wrap: boolean;
  dataBars: boolean;
  formatRules: readonly FormatRule[];
  total: Aggregate | null;
  /** Stays put while the table scrolls sideways (one of the leading frozen columns). */
  frozen: boolean;
};
