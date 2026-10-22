import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { TreeNodeSelectEvent } from 'primeng/tree';
import { NotificationService } from '../../core/services/notification.service';
import {
  OpenableReport,
  ReportSearchResult,
  ReportSummary,
  ReportOpening,
} from '../../core/models/report';
import { ContentRow } from './models/content-row';
import { FolderTreeStore } from './folder-tree.store';
import { HomeContentsStore } from './home-contents.store';
import { HomeItemActionsService } from './home-item-actions.service';
import { HomeSearchStore } from './home-search.store';

/**
 * Facade over the home screen's contents, search, tree and dialog stores. Provided at the page
 * component so it shares the home route's lifetime.
 */
@Injectable()
export class HomeStore {
  public readonly tree = inject(FolderTreeStore);
  public readonly contents = inject(HomeContentsStore);
  public readonly search = inject(HomeSearchStore);

  public readonly railCollapsed = signal(false);

  public readonly homeItem: MenuItem = {
    icon: 'pi pi-home',
    command: () => this.selectFolder(null),
  };

  /** True while Move or Create prefetches data for its dialog. */
  public readonly actionsBusy = computed(() => this.actions.busy());
  public readonly treeLoading = computed(
    () => !this.tree.hasChildrenLoaded(FolderTreeStore.ROOT_KEY),
  );

  public readonly treeSelectionKeys = computed<Record<string, boolean>>(() => {
    // PrimeNG only re-applies selection when this reference changes, so emit a fresh one once a deep
    // link's reveal adds the selected node.
    this.tree.nodes();
    return { [String(this.contents.selectedFolderId() ?? FolderTreeStore.ROOT_KEY)]: true };
  });

  public readonly breadcrumbItems = computed<MenuItem[]>(() =>
    this.contents.folderPath().map((folder) => ({
      label: folder.name,
      command: () => this.selectFolder(folder.id),
    })),
  );

  public readonly contextMenuItems = computed<MenuItem[]>(() => {
    const row = this.contextRow();
    if (!row) {
      return [];
    }
    const openItems: MenuItem[] =
      row.kind === 'folder'
        ? [{ label: 'Open', icon: 'pi pi-folder-open', command: () => this.selectFolder(row.id) }]
        : ReportOpening.options(row.report).map((option) => ({
            label: option.label,
            icon: option.icon,
            command: () => this.router.navigate(option.route),
          }));
    return [
      ...openItems,
      { label: 'Rename', icon: 'pi pi-pencil', command: () => this.rename(row) },
      { label: 'Move', icon: 'pi pi-arrows-alt', command: () => this.move(row) },
      { label: 'Sharing', icon: 'pi pi-users', command: () => this.permissions(row) },
      { separator: true },
      { label: 'Delete', icon: 'pi pi-trash', command: () => this.remove(row) },
    ];
  });

  public readonly contentsLoading = this.contents.loading;
  public readonly contentsError = this.contents.error;
  public readonly hasContent = this.contents.hasContent;
  public readonly folderRows = this.contents.folderRows;
  public readonly reportRows = this.contents.reportRows;
  public readonly favorites = this.contents.favorites;
  public readonly recent = this.contents.recent;
  public readonly searchQuery = this.search.query;
  public readonly searchResults = this.search.results;
  public readonly searching = this.search.searching;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly actions = inject(HomeItemActionsService);
  private readonly notify = inject(NotificationService);

  private readonly contextRow = signal<ContentRow | null>(null);

  public init(): void {
    this.contents.init();
  }

  public onNodeSelect(event: TreeNodeSelectEvent): void {
    const key = event.node.key;
    this.selectFolder(key === FolderTreeStore.ROOT_KEY || !key ? null : Number(key));
  }

  /**
   * The URL drives the selection. Also leaves search mode, so a rail click doesn't move the
   * selection under stale results.
   */
  public selectFolder(id: number | null): void {
    this.clearSearch();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folderId: id },
      queryParamsHandling: 'merge',
    });
  }

  public onSearchInput(value: string): void {
    this.search.onInput(value);
  }

  public clearSearch(): void {
    this.search.clear();
  }

  public openSearchResult(result: ReportSearchResult): void {
    this.openReport(result);
  }

  public toggleRail(): void {
    this.railCollapsed.update((collapsed) => !collapsed);
  }

  public openRow(row: ContentRow): void {
    if (row.kind === 'folder') {
      this.selectFolder(row.id);
    } else {
      this.openReport(row.report);
    }
  }

  /** Opens the latest published version, else the draft editor. */
  public openReport(report: OpenableReport): void {
    const option = ReportOpening.defaultOption(report);
    if (option) {
      this.router.navigate(option.route);
    }
  }

  public toggleFavorite(report: ReportSummary): void {
    this.contents.toggleFavorite(report);
  }

  public prepareContextMenu(row: ContentRow): void {
    this.contextRow.set(row);
  }

  public openCreateDialog(): void {
    this.actions.create(this.contents.selectedFolderId()).subscribe((outcome) => {
      if (outcome.kind === 'folder') {
        this.contents.reload();
        this.notify.success('Folder created.');
      } else {
        this.router.navigate(['/reports', outcome.reportId, 'edit']);
      }
    });
  }

  private rename(row: ContentRow): void {
    this.actions.rename(row).subscribe(() => {
      this.contents.reload();
      this.notify.success(`${this.label(row)} renamed.`);
    });
  }

  private move(row: ContentRow): void {
    this.actions.move(row).subscribe((destination) => {
      this.contents.reload();
      if (destination !== this.contents.selectedFolderId()) {
        this.tree.refreshNodeIfPresent(destination);
      }
      this.notify.success(`${this.label(row)} moved.`);
    });
  }

  private permissions(row: ContentRow): void {
    this.actions.permissions(row).subscribe((changed) => {
      if (changed) {
        this.contents.reload();
      }
    });
  }

  private remove(row: ContentRow): void {
    this.actions.remove(row).subscribe({
      next: () => {
        this.contents.reload();
        this.notify.success(`${this.label(row)} deleted.`);
      },
      error: (err: { status?: number }) => {
        // The interceptor toasts a 403; conflict and generic messages are handled here.
        this.notify.apiError(
          err,
          err?.status === 409
            ? 'That folder still has folders or reports in it — empty it first.'
            : 'Something went wrong deleting that.',
        );
      },
    });
  }

  private label(row: ContentRow): string {
    return row.kind === 'folder' ? 'Folder' : 'Report';
  }
}
