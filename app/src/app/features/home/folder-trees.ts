import { TreeNode } from 'primeng/api';
import { Folder } from '../../core/models/folder/folder.model';

/** Builds folder pickers' tree nodes from a flat folder list. */
export class FolderTrees {
  /** Groups by parent id so tree building is O(n). */
  public static groupByParent<T>(
    items: readonly T[],
    parentIdOf: (item: T) => number | null,
  ): Map<number | null, T[]> {
    const byParent = new Map<number | null, T[]>();
    for (const item of items) {
      const key = parentIdOf(item);
      const siblings = byParent.get(key);
      if (siblings) {
        siblings.push(item);
      } else {
        byParent.set(key, [item]);
      }
    }
    return byParent;
  }

  /** Builds `TreeNode` children recursively; `makeNode` shapes each folder's node. */
  public static buildNodes(
    parentId: number | null,
    foldersByParent: Map<number | null, Folder[]>,
    makeNode: (folder: Folder, children: TreeNode[]) => TreeNode,
  ): TreeNode[] {
    return (foldersByParent.get(parentId) ?? []).map((folder) =>
      makeNode(folder, FolderTrees.buildNodes(folder.id, foldersByParent, makeNode)),
    );
  }
}
