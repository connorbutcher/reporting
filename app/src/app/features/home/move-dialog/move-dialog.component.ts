import { Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TreeNode } from 'primeng/api';
import { TreeModule, TreeNodeSelectEvent } from 'primeng/tree';
import { Folder } from '../../../core/models/folder.model';
import { buildFolderTreeNodes } from '../folder-tree-nodes.util';
import { ROOT_KEY } from '../folder-tree.store';
import { groupByParent } from '../group-by-parent.util';

export interface MoveDialogData {
  kind: 'folder' | 'report';
  itemName: string;
  folders: Folder[];
  currentFolderId: number | null;
  /** When moving a folder, its own id — it and its descendants can't be valid targets. */
  excludeSubtreeOf?: number;
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
  public readonly data = inject<MoveDialogData>(DIALOG_DATA);

  public readonly selectedFolderId = signal<number | null>(this.data.currentFolderId);

  public readonly treeNodes = computed<TreeNode[]>(() => [
    {
      key: ROOT_KEY,
      label: 'Home',
      icon: 'pi pi-home',
      expanded: true,
      children: this.childNodes(null),
    },
  ]);

  public readonly selectionKeys = computed<Record<string, boolean>>(() => ({
    [String(this.selectedFolderId() ?? ROOT_KEY)]: true,
  }));

  public readonly isUnchanged = computed(
    () => this.selectedFolderId() === this.data.currentFolderId,
  );

  private readonly dialogRef = inject(DialogRef<number | null | undefined>);

  private readonly foldersByParent = computed(() =>
    groupByParent(this.data.folders, (f) => f.parentFolderId),
  );

  private readonly excludedIds = computed(() => {
    if (this.data.excludeSubtreeOf === undefined) return new Set<number>();
    return this.collectSubtreeIds(this.data.excludeSubtreeOf);
  });

  public onNodeSelect(event: TreeNodeSelectEvent): void {
    const key = event.node.key;
    if (key && this.excludedIds().has(Number(key))) return;
    this.selectedFolderId.set(key === ROOT_KEY || !key ? null : Number(key));
  }

  public move(): void {
    this.dialogRef.close(this.selectedFolderId());
  }

  public cancel(): void {
    this.dialogRef.close();
  }

  private childNodes(parentId: number | null): TreeNode[] {
    return buildFolderTreeNodes(parentId, this.foldersByParent(), (folder, children) => {
      const disabled = this.excludedIds().has(folder.id);
      return {
        key: String(folder.id),
        label: folder.name,
        icon: 'pi pi-folder',
        expanded: true,
        selectable: !disabled,
        styleClass: disabled ? 'move-dialog-node--disabled' : undefined,
        children,
      };
    });
  }

  /** The folder itself plus every folder nested under it, so it can't become its own descendant. */
  private collectSubtreeIds(rootId: number): Set<number> {
    const ids = new Set<number>([rootId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const parentId = queue.pop()!;
      for (const child of this.foldersByParent().get(parentId) ?? []) {
        ids.add(child.id);
        queue.push(child.id);
      }
    }
    return ids;
  }
}
