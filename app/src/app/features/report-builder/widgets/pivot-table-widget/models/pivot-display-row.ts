import { FilterGroup } from '../../../../../core/models/filter/index';
import { PivotRow } from '../../../../../core/models/widget-query/index';

/** A row flattened for display, aligned to the dimension and value columns. */
export interface PivotDisplayRow {
  /** The dimension cells as shown, with values repeated from the row above blanked. */
  dimensions: string[];
  /** The row's own dimension values, unblanked. */
  path: string[];
  values: PivotRow['values'];
  isSubtotal: boolean;
  depth: number;
  /** The outline key of this row's group ("North\u0001Bolt"), for collapsing a subtotal's children. */
  groupKey: string;
  drill: FilterGroup | null;
}
