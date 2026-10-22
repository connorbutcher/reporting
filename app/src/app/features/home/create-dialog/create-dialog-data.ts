import { Folder } from '../../../core/models/folder/folder.model';
import { ReportSummary } from '../../../core/models/report';

export type CreateDialogData = {
  folders: Folder[];
  reports: ReportSummary[];
  /** The folder the new item will be created in (null = Home). Drives the uniqueness check. */
  folderId: number | null;
};
