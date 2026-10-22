export type RenameDialogData = {
  kind: 'folder' | 'report';
  id: number;
  currentName: string;
  /** The folder this item currently sits in (null = Home) — the name must stay unique among its siblings there. */
  folderId: number | null;
};
