import { TreeNode } from 'primeng/api';
import { Folder } from '../../core/models/folder/folder.model';

/** Builds folder pickers' tree nodes from a flat folder list. */
export class FolderTrees {
  /**
   * Groups a flat list into a lookup by parent id, so a recursive tree builder can pull a level's
   * direct children in O(1) instead of re-filtering the whole flat list at every level — which is
   * what the move and create dialogs' tree builders used to do (an O(depth × n) walk over the same
   * array). Shared here since both dialogs build a folder hierarchy from the same flat shape.
   */
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

  /**
   * Recursively builds a folder's `TreeNode` children from a parent-id lookup (see
   * {@link FolderTrees.groupByParent}), shared by the move and create dialogs' folder pickers. `makeNode`
   * shapes one folder's own node fields (key/label/selectable/etc.) — this only handles the
   * recursion and lets each caller mix in its own leaves (create also lists reports) or styling
   * (move disables excluded subtrees).
   */
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
