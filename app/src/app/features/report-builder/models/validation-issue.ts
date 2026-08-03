import { PanelView } from '../side-panel/panel-view';

/**
 * Errors mean the report is broken and must not be saved. Warnings mean it is
 * merely unfinished — a table with no dataset yet is expected right after it is
 * added, so those must never block saving or new widgets could never persist.
 */
export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  /** Stable across recomputes so the list doesn't flicker. */
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  widgetId?: string;
  /** Where clicking the issue should take the user. */
  view: PanelView;
}
