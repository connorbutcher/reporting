/**
 * A validation problem with a dataset. Errors mean the dataset is broken and
 * can't be used as-is; warnings mean it's merely unfinished (a source that
 * hasn't been pointed at anything yet, say).
 */
export type DatasetIssueSeverity = 'error' | 'warning';

export interface DatasetIssue {
  /** Stable across recomputes so the list doesn't flicker. */
  id: string;
  severity: DatasetIssueSeverity;
  title: string;
  detail: string;
}
