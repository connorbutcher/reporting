import { Injectable, computed, inject, signal } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TreeNodeExpandEvent } from 'primeng/tree';
import { FolderApiService } from '../../core/api/folder-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Folder } from '../../core/models/folder.model';

/** Key used for the synthetic root node, since folder ids are never this string. */
export const ROOT_KEY = '__root__';

/**
 * Lazy folder-tree state for the home page, pulled out of the component so it only owns
 * selection and content loading. A component-provided collaborator — constructed by Angular
 * DI, not `new`'d — so it shares the home page's injector with {@link HomeContentsStore} and
 * {@link HomeStore}, which hold it as a field rather than constructing it themselves.
 *
 * The tree is rebuilt fresh from these signals on every change, rather than mutating shared
 * TreeNode objects in place — PrimeNG's Tree only reliably picks up structural changes (new
 * children appearing under a node) when it receives genuinely new node objects, not an
 * existing tree with properties patched on it.
 *
 * PrimeNG tree keys are always strings, so folder ids (numbers) are stringified at this
 * boundary; everywhere else in the app deals with the numeric id directly.
 */
@Injectable()
export class FolderTreeStore {
  public readonly nodes = computed<TreeNode[]>(() => [
    this.buildTreeNode(ROOT_KEY, 'Home', 'pi pi-home', true),
  ]);

  /** Every folder we've learned about so far, from any children fetch — keyed by its stringified id. */
  private readonly knownFolders = signal<Map<string, Folder>>(new Map());
  /** Child folder keys already fetched for each parent key (ROOT_KEY or a stringified folder id). */
  private readonly childrenOf = signal<Map<string, string[]>>(new Map());
  private readonly expandedKeys = signal<Set<string>>(new Set([ROOT_KEY]));
  private readonly loadingKeys = signal<Set<string>>(new Set());

  private readonly folderApi = inject(FolderApiService);
  private readonly notify = inject(NotificationService);

  /**
   * Whether a parent's children have been fetched yet — for a key (ROOT_KEY or a stringified
   * folder id). Reactive, so a caller can drive a loading skeleton off it. The root's children
   * can arrive either from an explicit {@link fetchChildren} or from the home page folding its
   * own contents fetch in via {@link merge}, so this is the single source of "is the tree ready".
   */
  public hasChildrenLoaded(key: string): boolean {
    return this.childrenOf().has(key);
  }

  /** Loads a parent's children into the tree; returns the subscription so callers can chain teardown. */
  public fetchChildren(parentId: number | null, key: string) {
    this.loadingKeys.update((s) => new Set(s).add(key));
    return this.folderApi.children(parentId).subscribe({
      next: (children) => {
        this.merge(key, children);
        this.clearLoading(key);
      },
      // Clear the key either way, so a failed expand stops spinning instead of
      // hanging on its loading indicator forever.
      error: (err) => {
        this.clearLoading(key);
        this.notify.loadError(err, "Couldn't load that folder's contents. Please try again.");
      },
    });
  }

  /** Folds a children fetch into the tree's known state — shared by expand, initial load, and post-mutation refreshes. */
  public merge(key: string, children: Folder[]): void {
    this.knownFolders.update((m) => {
      const next = new Map(m);
      for (const folder of children) next.set(String(folder.id), folder);
      return next;
    });
    this.childrenOf.update((m) =>
      new Map(m).set(
        key,
        children.map((f) => String(f.id)),
      ),
    );
  }

  public onNodeExpand(event: TreeNodeExpandEvent): void {
    const key = event.node?.key;
    if (!key) return;
    this.expandedKeys.update((s) => new Set(s).add(key));
    if (this.childrenOf().has(key)) return;
    this.fetchChildren(key === ROOT_KEY ? null : Number(key), key);
  }

  /**
   * Expands the tree down to a folder reached directly by URL, fetching any ancestor levels not
   * yet loaded so the target becomes visible (and can be highlighted). `path` runs root → target,
   * as returned by the folder path endpoint. Each ancestor must be expanded and have its children
   * loaded for the next level to appear; the target itself only needs to be visible, not opened.
   */
  public revealPath(path: Folder[]): void {
    for (const folder of path.slice(0, -1)) {
      const key = String(folder.id);
      this.expandedKeys.update((s) => new Set(s).add(key));
      if (!this.childrenOf().has(key)) this.fetchChildren(folder.id, key);
    }
  }

  /** Refreshes a folder's tree entry from the server — for a folder other than the one just loaded via `merge`. */
  public refreshNodeIfPresent(folderId: number | null): void {
    const key = folderId !== null ? String(folderId) : ROOT_KEY;
    if (!this.childrenOf().has(key)) return;
    this.folderApi.children(folderId).subscribe((children) => this.merge(key, children));
  }

  private clearLoading(key: string): void {
    this.loadingKeys.update((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
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
        return this.buildTreeNode(id, folder.name, 'pi pi-folder', folder.hasChildren);
      }),
    };
  }
}
