import { PanelView } from '../side-panel/panel-view';
import { IssueSeverity } from './issue-severity';

export type ValidationIssue = {
  /** Stable across recomputes so the list doesn't flicker. */
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  widgetId?: string;
  /** Where clicking the issue should take the user. */
  view: PanelView;
};
