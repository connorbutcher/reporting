import { FilterGroup } from '../../filter';

/** One combination of column-field values across the top. */
export type PivotColumnKey = {
  labels: string[];
  /** Conditions selecting the rows behind this column; null when they can't be expressed. */
  drill?: FilterGroup | null;
};
