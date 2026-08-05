export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  modifiedAt: string;
  /** Whether this folder has any child folders. Only populated by the children/lazy-tree endpoint. */
  hasChildren: boolean;
}
