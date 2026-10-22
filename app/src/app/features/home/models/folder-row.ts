import { ContentRowBase } from './content-row-base';
import { Folder } from '../../../core/models/folder/folder.model';

/** A folder, normalized into the shared row shape so it can share row-action logic (open/rename/move/delete) with a report. */
export type FolderRow = ContentRowBase & {
  kind: 'folder';
  number: null;
  status: null;
  statusKind: null;
  folder: Folder;
};
