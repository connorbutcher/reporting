import { FilterGroup } from '../../filter';

/**
 * Set client-side when an overlay chart queries several bindings and some fail: the chart still
 * draws the ones that loaded, and this says how many it had to leave out.
 */
/**
 * What a grouping chart knows about one category beyond its label: its natural sort key, so several
 * datasets' categories merge in order, and the conditions selecting its rows, for drill-through.
 */
export type ChartCategoryDetail = {
  sortNumber?: number | null;
  sortText?: string | null;
  isBlank?: boolean;
  isOther?: boolean;
  drill?: FilterGroup | null;
};
