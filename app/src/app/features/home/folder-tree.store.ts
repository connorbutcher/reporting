import { Injectable, computed, inject, signal } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TreeNodeExpandEvent } from 'primeng/tree';
import { FolderApiService } from '../../core/api/folder-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Folder } from '../../core/models/folder/folder.model';

/**
 * Lazy folder tree for the home rail. Nodes are rebuilt on every change because PrimeNG's Tree only
 * picks up new children from new node objects. Keys are stringified folder ids.
 */
@Injectable()
export class FolderTreeStore {
  public static readonly ROOT_KEY = '__root__';
  public readonly nodes = computed<TreeNode[]>(() => [
    this.buildTreeNode(FolderTreeStore.ROOT_KEY, 'Home', 'pi pi-home', true),
  ]);

  private readonly knownFolders = signal<Map<string, Folder>>(new Map());
  private readonly childrenOf = signal<Map<string, string[]>>(new Map());
  private readonly expandedKeys = signal<Set<string>>(new Set([FolderTreeStore.ROOT_KEY]));
  private readonly loadingKeys = signal<Set<string>>(new Set());

  private readonly folderApi = inject(FolderApiService);
  private readonly notify = inject(NotificationService);

  /** Whether a parent's children have loaded, from {@link fetchChildren} or {@link merge}. */
  public hasChildrenLoaded(key: string): boolean {
    return this.childrenOf().has(key);
  }

  public fetchChildren(parentId: number | null, key: string) {
    this.loadingKeys.update((s) => new Set(s).add(key));
    return this.folderApi.children(parentId).subscribe({
      next: (children) => {
        this.merge(key, children);
        this.clearLoading(key);
      },
      // Cleared either way so a failed expand stops spinning.
      error: (err) => {
        this.clearLoading(key);
        this.notify.loadError(err, "Couldn't load that folder's contents. Please try again.");
      },
    });
  }

  public merge(key: string, children: Folder[]): void {
    this.knownFolders.update((m) => {
      const next = new Map(m);
      for (const folder of children) {
        next.set(String(folder.id), folder);
      }
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
    if (!key) {
      return;
    }
    this.expandedKeys.update((s) => new Set(s).add(key));
    if (this.childrenOf().has(key)) {
      return;
    }
    this.fetchChildren(key === FolderTreeStore.ROOT_KEY ? null : Number(key), key);
  }

  /** Expands the tree down a root-to-target `path`, fetching unloaded ancestor levels. */
  public revealPath(path: Folder[]): void {
    for (const folder of path.slice(0, -1)) {
      const key = String(folder.id);
      this.expandedKeys.update((s) => new Set(s).add(key));
      if (!this.childrenOf().has(key)) {
        this.fetchChildren(folder.id, key);
      }
    }
  }

  public refreshNodeIfPresent(folderId: number | null): void {
    const key = folderId !== null ? String(folderId) : FolderTreeStore.ROOT_KEY;
    if (!this.childrenOf().has(key)) {
      return;
    }
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
