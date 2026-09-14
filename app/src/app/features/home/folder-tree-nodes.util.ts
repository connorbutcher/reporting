import { TreeNode } from 'primeng/api';
import { Folder } from '../../core/models/folder.model';

/**
 * Recursively builds a folder's `TreeNode` children from a parent-id lookup (see
 * {@link groupByParent}), shared by the move and create dialogs' folder pickers. `makeNode`
 * shapes one folder's own node fields (key/label/selectable/etc.) — this only handles the
 * recursion and lets each caller mix in its own leaves (create also lists reports) or styling
 * (move disables excluded subtrees).
 */
export function buildFolderTreeNodes(
  parentId: number | null,
  foldersByParent: Map<number | null, Folder[]>,
  makeNode: (folder: Folder, children: TreeNode[]) => TreeNode,
): TreeNode[] {
  return (foldersByParent.get(parentId) ?? []).map((folder) =>
    makeNode(folder, buildFolderTreeNodes(folder.id, foldersByParent, makeNode)),
  );
}
