import { ReportFilter } from '../filter';
import { Widget } from './widget.model';

/** A report's identity and folder placement — everything except its content. */
export interface ReportSummary {
  id: number;
  number: number;
  name: string;
  folderId: number | null;
  hasDraft: boolean;
  latestVersionNumber: number | null;
  modifiedAt: string;
}

/** The content of one revision of a report — either the checked-out draft or one published version. */
export interface ReportRevisionContent {
  reportId: number;
  name: string;
  columns: number;
  rows: number;
  widgets: Widget[];
  /** Rich-text (HTML) description of what changed. Null for drafts. */
  notes: string | null;
  /** Report-level filters, one per dataset, applied on top of each widget's own. */
  filters: ReportFilter[];
}

export interface ReportVersionSummary {
  versionNumber: number;
  publishedAt: string;
  /** Rich-text (HTML) description of what changed in this version, entered when publishing. */
  notes: string | null;
}

/** A report match from a name/number search, with its folder location for display. */
export interface ReportSearchResult {
  id: number;
  number: number;
  name: string;
  hasDraft: boolean;
  latestVersionNumber: number | null;
  modifiedAt: string;
  folderPath: string;
}
