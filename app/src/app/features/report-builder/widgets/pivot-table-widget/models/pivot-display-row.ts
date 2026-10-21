import { FilterGroup } from '../../../../../core/models/filter';
import { PivotRow } from '../../../../../core/models/widget-query';

export interface PivotDisplayRow {
  /** As shown, with values repeated from the row above blanked. */
  dimensions: string[];
  path: string[];
  values: PivotRow['values'];
  isSubtotal: boolean;
  depth: number;
  /** The group's outline key ("North\u0001Bolt"), for collapsing a subtotal's children. */
  groupKey: string;
  drill: FilterGroup | null;
}
