import { DateGrouping } from './date-grouping.model';

/** Groups a date row or column field by period rather than by exact value. */
export type PivotFieldGrouping = {
  columnId: string;
  grouping: DateGrouping;
};
