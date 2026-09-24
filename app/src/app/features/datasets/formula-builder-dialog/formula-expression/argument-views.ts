import { FormulaIssue, FormulaScope } from '../model';
import { ArgumentView } from './argument-view';

/** A call's argument views, and what they were worked out from — so they are reused until that changes. */
export interface ArgumentViews {
  scope: FormulaScope;
  issues: ReadonlyMap<string, FormulaIssue[]>;
  views: ArgumentView[];
}
