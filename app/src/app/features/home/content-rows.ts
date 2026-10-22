import { Folder } from '../../core/models/folder/folder.model';
import { FolderRow } from './models/folder-row';
import { ReportSummary } from '../../core/models/report';
import { ReportRow } from './models/report-row';

/** Folders and reports normalised into the home page's shared row shape. */
export class ContentRows {
  public static fromFolder(folder: Folder): FolderRow {
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

  public static fromReport(report: ReportSummary): ReportRow {
    const statusKind = report.hasDraft
      ? 'draft'
      : report.latestVersionNumber
        ? 'published'
        : 'empty';
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
      accessLevel: report.accessLevel,
      isFavorite: report.isFavorite,
      modifiedAt: report.modifiedAt,
      report,
    };
  }
}
