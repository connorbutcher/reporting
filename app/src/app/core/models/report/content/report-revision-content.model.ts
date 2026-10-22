import { Tab } from './tab.model';
import { ReportFilter } from '../../filter';

/** The content of one revision of a report — either the checked-out draft or one published version. */
export type ReportRevisionContent = {
  reportId: number;
  name: string;
  /** The revision's tabs, ordered; each carries its own grid and widgets. */
  tabs: Tab[];
  /** Rich-text (HTML) description of what changed. Null for drafts. */
  notes: string | null;
  /** Report-level filters, one per dataset, applied on top of each widget's own. */
  filters: ReportFilter[];
};
