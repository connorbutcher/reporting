import { FormulaIssueKind } from './formula-issue-kind';

/**
 * A problem, on the item it is about. One about a function's argument as a whole — an empty required one,
 * or a value of the wrong kind — also names the function and argument (`ownerId`, `arg`), so it can be
 * shown on that argument's row.
 */
export interface FormulaIssue {
  kind: FormulaIssueKind;
  blockId: number;
  message: string;
  ownerId?: number;
  arg?: number;
}
