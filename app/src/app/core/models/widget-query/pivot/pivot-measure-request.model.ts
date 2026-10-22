import { PivotAggregate, PivotShowAs } from '../../report';

/** One measure the pivot computes: an aggregate over a column (null column for `count`). */
export type PivotMeasureRequest = {
  columnId: string | null;
  aggregate: PivotAggregate;
  showAs?: PivotShowAs;
  /** Overrides the derived column header; blank uses the derived one. */
  label: string;
};
