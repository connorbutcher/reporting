import { FilterGroup } from '../../filter';

/** A category's sort key, for merging datasets in order, and its conditions, for drill-through. */
export type ChartCategoryDetail = {
  sortNumber?: number | null;
  sortText?: string | null;
  isBlank?: boolean;
  isOther?: boolean;
  drill?: FilterGroup | null;
};
