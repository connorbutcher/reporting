import { Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TreeNode } from 'primeng/api';
import { TreeModule, TreeNodeSelectEvent } from 'primeng/tree';
import { Folder } from '../../../core/models/folder.model';

const ROOT_KEY = '__root__';

export interface MoveDialogData {
  kind: 'folder' | 'report';
  itemName: string;
  folders: Folder[];
  currentFolderId: string | null;
  /** When moving a folder, its own id — it and its descendants can't be valid targets. */
  excludeSubtreeOf?: string;
}

/**
 * Lets the user pick a destination folder from the same tree shown on the
 * home page. Closes with the chosen folder id (`null` for the root), or
 * `undefined` if cancelled.
 */
@Component({
  selector: 'app-move-dialog',
  imports: [TreeModule],
  templateUrl: './move-dialog.component.html',
  styleUrl: './move-dialog.component.scss',
})
export class MoveDialogComponent {
  private readonly dialogRef = inject(DialogRef<string | null | undefined>);
  protected readonly data = inject<MoveDialogData>(DIALOG_DATA);

  protected readonly selectedFolderId = signal<string | null>(this.data.currentFolderId);

  private readonly excludedIds = computed(() => {
    if (!this.data.excludeSubtreeOf) return new Set<string>();
    return this.collectSubtreeIds(this.data.excludeSubtreeOf);
  });

  protected readonly treeNodes = computed<TreeNode[]>(() => [
    {
      key: ROOT_KEY,
      label: 'Home',
      icon: 'pi pi-home',
      expanded: true,
      children: this.childNodes(null),
    },
  ]);

  protected readonly selectionKeys = computed<Record<string, boolean>>(() => ({
    [this.selectedFolderId() ?? ROOT_KEY]: true,
  }));

  protected readonly isUnchanged = computed(() => this.selectedFolderId() === this.data.currentFolderId);

  private childNodes(parentId: string | null): TreeNode[] {
    return this.data.folders
      .filter((f) => f.parentFolderId === parentId)
      .map((folder) => {
        const disabled = this.excludedIds().has(folder.id);
        return {
          key: folder.id,
          label: folder.name,
          icon: 'pi pi-folder',
          expanded: true,
          selectable: !disabled,
          styleClass: disabled ? 'move-dialog__node--disabled' : undefined,
          children: this.childNodes(folder.id),
        };
      });
  }

  /** The folder itself plus every folder nested under it, so it can't become its own descendant. */
  private collectSubtreeIds(rootId: string): Set<string> {
    const ids = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const folder of this.data.folders) {
        if (folder.parentFolderId && ids.has(folder.parentFolderId) && !ids.has(folder.id)) {
          ids.add(folder.id);
          added = true;
        }
      }
    }
    return ids;
  }

  protected onNodeSelect(event: TreeNodeSelectEvent): void {
    const key = event.node.key;
    if (key && this.excludedIds().has(key)) return;
    this.selectedFolderId.set(key === ROOT_KEY || !key ? null : key);
  }

  protected move(): void {
    this.dialogRef.close(this.selectedFolderId());
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
