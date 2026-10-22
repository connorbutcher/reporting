import { Folder } from '../../../core/models/folder/folder.model';

export type MoveDialogData = {
  kind: 'folder' | 'report';
  itemName: string;
  folders: Folder[];
  currentFolderId: number | null;
  /** When moving a folder, its own id — it and its descendants can't be valid targets. */
  excludeSubtreeOf?: number;
};
