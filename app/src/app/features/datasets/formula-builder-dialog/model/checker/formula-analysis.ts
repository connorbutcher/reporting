import { FormulaValueKind } from '../../../../../core/models/dataset';
import { FormulaIssue } from './formula-issue';

export interface FormulaAnalysis {
  /** The kind of value the formula produces; `any` when it can't be told, or there is no formula. */
  kind: FormulaValueKind;
  issues: FormulaIssue[];
}
