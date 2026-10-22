import { DatasetIssueSeverity } from './dataset-issue-severity';

export type DatasetIssue = {
  /** Stable across recomputes so the list doesn't flicker. */
  id: string;
  severity: DatasetIssueSeverity;
  title: string;
  detail: string;
};
