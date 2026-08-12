import { Folder } from '../../core/models/folder.model';
import { ReportSummary } from '../../core/models/report.model';

/** A folder or report, normalized to one shape so both can share row-action logic (open/rename/move/delete). */
export interface ContentRow {
  kind: 'folder' | 'report';
  id: string;
  name: string;
  number: number | null;
  status: string | null;
  /** Drives the status stripe/text colour on a report row. Null for folders. */
  statusKind: 'draft' | 'published' | 'empty' | null;
  modifiedAt: string;
  folder?: Folder;
  report?: ReportSummary;
}

export function folderToRow(folder: Folder): ContentRow {
  return {
    kind: 'folder',
    id: folder.id,
    name: folder.name,
    number: null,
    status: null,
    statusKind: null,
    modifiedAt: folder.modifiedAt,
    folder,
  };
}

export function reportToRow(report: ReportSummary): ContentRow {
  const statusKind = report.hasDraft ? 'draft' : report.latestVersionNumber ? 'published' : 'empty';
  return {
    kind: 'report',
    id: report.id,
    name: report.name,
    number: report.number,
    status: report.hasDraft
      ? 'Draft'
      : report.latestVersionNumber
        ? `Published · v${report.latestVersionNumber}`
        : 'No versions',
    statusKind,
    modifiedAt: report.modifiedAt,
    report,
  };
}
