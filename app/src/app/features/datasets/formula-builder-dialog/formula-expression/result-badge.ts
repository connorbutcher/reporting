import { FormulaScope } from '../model';

/** A function's return badge, and the scope it was worked out in. */
export type ResultBadge = {
  scope: FormulaScope;
  badge: string;
};
