import { Folder } from '../../core/models/folder.model';
import { ReportSummary } from '../../core/models/report.model';

/** A row plus the mouse event that triggered its context menu, emitted up to the page which owns the shared menu. */
export interface RowAction {
  event: MouseEvent;
  row: ContentRow;
}

interface ContentRowBase {
  id: number;
  name: string;
  modifiedAt: string;
}

/** A folder, normalized into the shared row shape so it can share row-action logic (open/rename/move/delete) with a report. */
export interface FolderRow extends ContentRowBase {
  kind: 'folder';
  number: null;
  status: null;
  statusKind: null;
  folder: Folder;
}

/** A report, normalized into the shared row shape. `statusKind` drives the status stripe/text colour. */
export interface ReportRow extends ContentRowBase {
  kind: 'report';
  number: number;
  status: string;
  statusKind: 'draft' | 'published' | 'empty';
  report: ReportSummary;
}

/**
 * A folder or report, normalized to one shape so both can share row-action logic. A discriminated
 * union rather than one interface with optional fields: narrowing on `kind` gets `.folder`/`.report`
 * (and the report-only `.number`/`.status`/`.statusKind`) without a non-null assertion at every use site.
 */
export type ContentRow = FolderRow | ReportRow;

export function folderToRow(folder: Folder): FolderRow {
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

export function reportToRow(report: ReportSummary): ReportRow {
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
