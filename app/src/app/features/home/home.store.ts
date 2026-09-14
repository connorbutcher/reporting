import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { TreeNodeSelectEvent } from 'primeng/tree';
import { NotificationService } from '../../core/services/notification.service';
import {
  OpenableReport,
  ReportSearchResult,
  ReportSummary,
  defaultOpenOption,
  reportOpenOptions,
} from '../../core/models/report';
import { ContentRow } from './content-row';
import { ROOT_KEY, FolderTreeStore } from './folder-tree.store';
import { HomeContentsStore } from './home-contents.store';
import { HomeItemActionsService } from './home-item-actions.service';
import { HomeSearchStore } from './home-search.store';

/**
 * Facade for the home screen: composes {@link HomeContentsStore} (folder contents, breadcrumb,
 * Favourites/Recent), {@link HomeSearchStore} (whole-tree search), {@link FolderTreeStore} (the
 * nav rail tree) and {@link HomeItemActionsService} (the row/create dialogs) into the one store
 * the page shell and its section components inject. Owns only what ties those collaborators
 * together: navigation, the shared context menu, and the row actions that need to coordinate a
 * dialog outcome with a reload and a tree refresh.
 *
 * Provided at the page component (not root), so it and its collaborators share the page's
 * lifetime and the home route's {@link ActivatedRoute}.
 */
@Injectable()
export class HomeStore {
  public readonly tree = inject(FolderTreeStore);
  public readonly contents = inject(HomeContentsStore);
  public readonly search = inject(HomeSearchStore);

  /** Collapses the folder tree to a slim strip, freeing width for the contents table. */
  public readonly railCollapsed = signal(false);

  public readonly homeItem: MenuItem = {
    icon: 'pi pi-home',
    command: () => this.selectFolder(null),
  };

  /** True while Move or Create is prefetching data for its dialog — see {@link HomeItemActionsService.busy}. */
  public readonly actionsBusy = computed(() => this.actions.busy());
  /** The rail shows its skeleton until the tree's root level is loaded — by whichever fetch got there first. */
  public readonly treeLoading = computed(() => !this.tree.hasChildrenLoaded(ROOT_KEY));

  public readonly treeSelectionKeys = computed<Record<string, boolean>>(() => {
    // Depend on the tree structure too: on a deep link the selected node doesn't exist yet when
    // the map is first bound, so emit a fresh reference once the reveal adds it — PrimeNG only
    // re-applies selection when this input's reference changes.
    this.tree.nodes();
    return { [String(this.contents.selectedFolderId() ?? ROOT_KEY)]: true };
  });

  public readonly breadcrumbItems = computed<MenuItem[]>(() =>
    this.contents.folderPath().map((folder) => ({
      label: folder.name,
      command: () => this.selectFolder(folder.id),
    })),
  );

  public readonly contextMenuItems = computed<MenuItem[]>(() => {
    const row = this.contextRow();
    if (!row) return [];
    // A report offers its real open methods (view published / edit draft) rather than one generic
    // "Open" — this is where a reader gets only "Open published" while an editor sees both.
    const openItems: MenuItem[] =
      row.kind === 'folder'
        ? [{ label: 'Open', icon: 'pi pi-folder-open', command: () => this.selectFolder(row.id) }]
        : reportOpenOptions(row.report).map((option) => ({
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

  // Pass-throughs so components can keep reading one store for every home-screen concern —
  // consumers don't need to know contents/search are separate collaborators.
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

  // --- selection ----------------------------------------------------------

  public onNodeSelect(event: TreeNodeSelectEvent): void {
    const key = event.node.key;
    this.selectFolder(key === ROOT_KEY || !key ? null : Number(key));
  }

  /**
   * Navigating is enough — writing `folderId` to the URL drives `selectedFolderId`, and the
   * contents, breadcrumb, and tree merge all react to it. Root clears the param for a clean link.
   *
   * Also leaves search mode: the tree rail stays visible while search results are showing, so
   * without this a rail click would silently move `selectedFolderId` underneath a screen that's
   * still displaying the old query's results.
   */
  public selectFolder(id: number | null): void {
    this.clearSearch();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folderId: id },
      queryParamsHandling: 'merge',
    });
  }

  // --- search -------------------------------------------------------------

  public onSearchInput(value: string): void {
    this.search.onInput(value);
  }

  public clearSearch(): void {
    this.search.clear();
  }

  public openSearchResult(result: ReportSearchResult): void {
    this.openReport(result);
  }

  // --- tree rail ----------------------------------------------------------

  public toggleRail(): void {
    this.railCollapsed.update((collapsed) => !collapsed);
  }

  // --- row actions --------------------------------------------------------

  public openRow(row: ContentRow): void {
    if (row.kind === 'folder') this.selectFolder(row.id);
    else this.openReport(row.report);
  }

  /**
   * Opens a report by its default method: the latest published version when there is one, otherwise
   * the draft editor (only ever reached by an editor). The explicit view-vs-edit choice, when both
   * exist, lives in the context menu and the strip cards.
   */
  public openReport(report: OpenableReport): void {
    const option = defaultOpenOption(report);
    if (option) this.router.navigate(option.route);
  }

  public toggleFavorite(report: ReportSummary): void {
    this.contents.toggleFavorite(report);
  }

  /** Arms the shared context menu for a row; the shell component then shows the overlay. */
  public prepareContextMenu(row: ContentRow): void {
    this.contextRow.set(row);
  }

  // --- create -------------------------------------------------------------

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
      if (destination !== this.contents.selectedFolderId())
        this.tree.refreshNodeIfPresent(destination);
      this.notify.success(`${this.label(row)} moved.`);
    });
  }

  private permissions(row: ContentRow): void {
    // Changing sharing can change what's visible, so refresh the contents if anything was saved.
    this.actions.permissions(row).subscribe((changed) => {
      if (changed) this.contents.reload();
    });
  }

  private remove(row: ContentRow): void {
    this.actions.remove(row).subscribe({
      next: () => {
        this.contents.reload();
        this.notify.success(`${this.label(row)} deleted.`);
      },
      error: (err: { status?: number }) => {
        // A 403 is surfaced by the global interceptor; keep the conflict and generic messages here.
        this.notify.apiError(
          err,
          err?.status === 409
            ? 'That folder still has folders or reports in it — empty it first.'
            : 'Something went wrong deleting that.',
        );
      },
    });
  }

  /** "Folder" or "Report", capitalised, for a toast about a row action. */
  private label(row: ContentRow): string {
    return row.kind === 'folder' ? 'Folder' : 'Report';
  }
}
