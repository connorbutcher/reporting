export interface Folder {
  id: number;
  name: string;
  parentFolderId: number | null;
  modifiedAt: string;
  /** Whether this folder has any child folders. Only populated by the children/lazy-tree endpoint. */
  hasChildren: boolean;
}
