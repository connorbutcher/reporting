import { FormulaParameter } from '../../../../core/models/dataset';
import { Expression, FormulaIssue } from '../model';

/** One argument of a function, prepared for the template. */
export interface ArgumentView {
  index: number;
  expression: Expression;
  parameter: FormulaParameter | null;
  label: string;
  /** Problems with the argument as a whole: empty when it needs a value, or the wrong kind of value. */
  issues: FormulaIssue[];
  /** A repeating parameter's spare argument the user can take away again. */
  removable: boolean;
}
