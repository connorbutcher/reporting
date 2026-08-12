import { computed, signal } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TreeNodeExpandEvent } from 'primeng/tree';
import { FolderApiService } from '../../core/api/folder-api.service';
import { Folder } from '../../core/models/folder.model';

/** Key used for the synthetic root node, since folder ids are never this string. */
export const ROOT_KEY = '__root__';

/**
 * Lazy folder-tree state for the home page, pulled out of the component so it
 * only owns selection and content loading. Mirrors the collaborator pattern used
 * by the report builder ({@link WidgetSelection} etc.): a plain class the page
 * constructs, not an injectable.
 *
 * The tree is rebuilt fresh from these signals on every change, rather than
 * mutating shared TreeNode objects in place — PrimeNG's Tree only reliably
 * picks up structural changes (new children appearing under a node) when it
 * receives genuinely new node objects, not an existing tree with properties
 * patched on it.
 */
export class FolderTreeStore {
  /** Every folder we've learned about so far, from any children fetch. */
  private readonly knownFolders = signal<Map<string, Folder>>(new Map());
  /** Child folder ids already fetched for each parent key (ROOT_KEY or a folder id). */
  private readonly childrenOf = signal<Map<string, string[]>>(new Map());
  private readonly expandedKeys = signal<Set<string>>(new Set([ROOT_KEY]));
  private readonly loadingKeys = signal<Set<string>>(new Set());

  readonly nodes = computed<TreeNode[]>(() => [
    this.buildTreeNode(ROOT_KEY, 'Home', 'pi pi-home', true),
  ]);

  constructor(private readonly folderApi: FolderApiService) {}

  /** Loads a parent's children into the tree; returns the subscription so callers can chain teardown. */
  fetchChildren(parentId: string | null, key: string) {
    this.loadingKeys.update((s) => new Set(s).add(key));
    return this.folderApi.children(parentId).subscribe((children) => {
      this.merge(key, children);
      this.loadingKeys.update((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    });
  }

  /** Folds a children fetch into the tree's known state — shared by expand, initial load, and post-mutation refreshes. */
  merge(key: string, children: Folder[]): void {
    this.knownFolders.update((m) => {
      const next = new Map(m);
      for (const folder of children) next.set(folder.id, folder);
      return next;
    });
    this.childrenOf.update((m) =>
      new Map(m).set(
        key,
        children.map((f) => f.id),
      ),
    );
  }

  onNodeExpand(event: TreeNodeExpandEvent): void {
    const key = event.node?.key;
    if (!key) return;
    this.expandedKeys.update((s) => new Set(s).add(key));
    if (this.childrenOf().has(key)) return;
    this.fetchChildren(key === ROOT_KEY ? null : key, key);
  }

  /** Refreshes a folder's tree entry from the server — for a folder other than the one just loaded via `merge`. */
  refreshNodeIfPresent(folderId: string | null): void {
    const key = folderId ?? ROOT_KEY;
    if (!this.childrenOf().has(key)) return;
    this.folderApi.children(folderId).subscribe((children) => this.merge(key, children));
  }

  private buildTreeNode(key: string, label: string, icon: string, hasChildren: boolean): TreeNode {
    const childIds = this.childrenOf().get(key);
    const folders = this.knownFolders();
    return {
      key,
      label,
      icon,
      expanded: this.expandedKeys().has(key),
      loading: this.loadingKeys().has(key),
      leaf: childIds ? childIds.length === 0 : !hasChildren,
      children: childIds?.map((id) => {
        const folder = folders.get(id)!;
        return this.buildTreeNode(folder.id, folder.name, 'pi pi-folder', folder.hasChildren);
      }),
    };
  }
}
