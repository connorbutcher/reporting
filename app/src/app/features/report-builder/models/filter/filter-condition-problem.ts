import { ValidationIssue } from '../validation-issue';
import { FilterContext } from './filter-context';

/** Why an enabled condition isn't narrowing the data. Only the first that applies is reported. */
export type ConditionProblem =
  | { kind: 'missingColumn' }
  | { kind: 'missingTolerance'; columnName: string | null }
  | { kind: 'missingValue'; columnName: string | null; operatorLabel: string; needed: number };

export interface ConditionFacts {
  readonly columnMissing: boolean;
  /** A tolerance operator on a column that has no banding. */
  readonly toleranceMissing: boolean;
  readonly complete: boolean;
  readonly columnName: string | null;
  readonly operatorLabel: string;
  readonly needed: number;
}

export function findProblem(facts: ConditionFacts): ConditionProblem | null {
  if (facts.columnMissing) return { kind: 'missingColumn' };
  if (facts.toleranceMissing) return { kind: 'missingTolerance', columnName: facts.columnName };
  if (!facts.complete) {
    return {
      kind: 'missingValue',
      columnName: facts.columnName,
      operatorLabel: facts.operatorLabel,
      needed: facts.needed,
    };
  }
  return null;
}

/** The inline note under a row. */
export function problemCue(problem: ConditionProblem): { severity: 'error' | 'warning'; message: string } {
  switch (problem.kind) {
    case 'missingColumn':
      return { severity: 'error', message: 'This column no longer exists.' };
    case 'missingTolerance':
      return { severity: 'warning', message: 'No tolerance banding here, so nothing matches.' };
    case 'missingValue':
      return { severity: 'error', message: problem.needed > 1 ? 'Enter both values.' : 'Enter a value.' };
  }
}

/** The same problem for the Issues panel, so the cue and the panel never disagree. */
export function problemIssue(problem: ConditionProblem, id: string, context: FilterContext): ValidationIssue {
  const where = { widgetId: context.widgetId, view: context.view ?? { kind: 'root' as const } };
  const issueId = `${id}:${problem.kind}`;

  switch (problem.kind) {
    case 'missingColumn':
      return {
        id: issueId,
        severity: 'error',
        title: 'A filter points at a column that no longer exists',
        detail: 'The dataset column was removed. Remove or repoint that filter condition.',
        ...where,
      };
    case 'missingTolerance':
      return {
        id: issueId,
        severity: 'warning',
        title: `Tolerance filter on "${problem.columnName ?? 'a column'}" has no banding`,
        detail:
          'This column no longer has tolerance banding, so the filter matches nothing. ' +
          'Add banding back to the column, or change this condition.',
        ...where,
      };
    case 'missingValue':
      return {
        id: issueId,
        severity: 'error',
        title: `Filter on "${problem.columnName ?? 'a column'}" is missing a value`,
        detail: `"${problem.operatorLabel}" needs ${problem.needed} value${problem.needed > 1 ? 's' : ''}.`,
        ...where,
      };
  }
}
