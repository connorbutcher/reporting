import { FormulaIssueKind } from './formula-issue-kind';

/** Argument-level problems also carry `ownerId` and `arg` so they show on that argument's row. */
export type FormulaIssue = {
  kind: FormulaIssueKind;
  blockId: number;
  message: string;
  ownerId?: number;
  arg?: number;
};
