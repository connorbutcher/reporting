/**
 * - `missing`: a function argument that needs a value and is empty.
 * - `structure`: items that don't fit together — an operator without a value beside it, two values with no operator between.
 * - `type`: a value of the wrong kind for the operator or parameter it feeds.
 * - `unknown`: a column or function that isn't there.
 * - `server`: found by the server's own check.
 */
export type FormulaIssueKind = 'missing' | 'structure' | 'type' | 'unknown' | 'server';
