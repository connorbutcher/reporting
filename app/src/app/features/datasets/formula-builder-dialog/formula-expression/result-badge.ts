import { FormulaScope } from '../model';

/** A function's return badge, and the scope it was worked out in. */
export interface ResultBadge {
  scope: FormulaScope;
  badge: string;
}
