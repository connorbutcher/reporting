export interface Folder {
  id: number;
  name: string;
  parentFolderId: number | null;
  modifiedAt: string;
  /** Whether this folder has any child folders. Only populated by the children/lazy-tree endpoint. */
  hasChildren: boolean;
}

/** Whether a candidate folder name is free among its siblings, for live validation as the user types. */
export interface FolderNameAvailable {
  available: boolean;
}
