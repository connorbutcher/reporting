import { PivotCell } from './pivot-cell.model';
import { FilterGroup } from '../../filter';

export type PivotRow = {
  /** Formatted dimension values, one per row field in order; empty for a total-only pivot. */
  dimensions: string[];
  /** Without column fields, one per measure; with them, a block of measures per column key, then the row totals. */
  values: PivotCell[];
  isGrandTotal: boolean;
  /** A subtotal row heading an outer group. */
  isSubtotal?: boolean;
  /** How many row fields the row is grouped by: all of them for a detail row, fewer for a subtotal. */
  depth?: number;
  /** Conditions selecting the rows behind this row; null when they can't be expressed. */
  drill?: FilterGroup | null;
};
