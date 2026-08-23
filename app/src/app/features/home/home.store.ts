import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { TreeNodeSelectEvent } from 'primeng/tree';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Folder } from '../../core/models/folder.model';
import { ReportSearchResult, ReportSummary } from '../../core/models/report';
import { ContentRow, FolderRow, ReportRow, folderToRow, reportToRow } from './content-row';
import { ROOT_KEY, FolderTreeStore } from './folder-tree.store';
import { HomeItemActionsService } from './home-item-actions.service';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * All state and coordination for the home screen: which folder is open (driven by the URL),
 * the folder tree, the current folder's contents and breadcrumb, whole-tree search, and the
 * row/create actions. The page shell and each of its section components inject this and read or
 * drive it directly, so the shell stays thin — mirroring how the report builder is composed
 * around {@link ReportBuilderStore}. The tree is a plain collaborator ({@link FolderTreeStore})
 * constructed here, the same way that store nests {@link WidgetSelection} and friends.
 *
 * Provided at the page component (not root), so its {@link ActivatedRoute} resolves to the home
 * route and its lifetime — and that of the subscriptions/effects below — is tied to the page.
 */
@Injectable()
export class HomeStore {
  private readonly folderApi = inject(FolderApiService);
  private readonly reportApi = inject(ReportApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly actions = inject(HomeItemActionsService);
  private readonly notify = inject(NotificationService);

  readonly tree = new FolderTreeStore(this.folderApi, this.notify);

  /** The URL is the source of truth for which folder is open, so a link deep into the tree is shareable. */
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** null means the root folder — represented by the absence of the `folderId` query param. */
  readonly selectedFolderId = computed<number | null>(() => {
    const raw = this.queryParams().get('folderId');
    return raw ? Number(raw) : null;
  });

  // Contents and breadcrumb refetch automatically whenever the selected folder changes.
  private readonly foldersResource = httpResource<Folder[]>(
    () => {
      const id = this.selectedFolderId();
      const params: Record<string, string> = {};
      if (id !== null) params['parentId'] = String(id);
      return { url: '/api/folders/children', params };
    },
    { defaultValue: [] },
  );
  private readonly reportsResource = httpResource<ReportSummary[]>(
    () => {
      const id = this.selectedFolderId();
      const params: Record<string, string> = {};
      if (id !== null) params['folderId'] = String(id);
      return { url: '/api/reports', params };
    },
    { defaultValue: [] },
  );
  private readonly pathResource = httpResource<Folder[]>(
    () => (this.selectedFolderId() ? `/api/folders/${this.selectedFolderId()}/path` : undefined),
    { defaultValue: [] },
  );

  // Guarded with hasValue(): httpResource's .value() throws once a resource is in its error
  // state, defaultValue notwithstanding — reading it unguarded (as this used to) took the whole
  // page down on a 404/403 from any of these three endpoints, e.g. a stale or permission-denied
  // folder link.
  readonly folderPath = computed(() => (this.pathResource.hasValue() ? this.pathResource.value() : []));
  readonly contentsLoading = computed(
    () => this.foldersResource.isLoading() || this.reportsResource.isLoading(),
  );
  /** True once the selected folder's contents or path failed to load — doesn't exist, or no access. */
  readonly contentsError = computed(
    () =>
      this.foldersResource.error() != null ||
      this.reportsResource.error() != null ||
      this.pathResource.error() != null,
  );
  /** True while Move or Create is prefetching data for its dialog — see {@link HomeItemActionsService.busy}. */
  readonly actionsBusy = this.actions.busy.asReadonly();
  /** The rail shows its skeleton until the tree's root level is loaded — by whichever fetch got there first. */
  readonly treeLoading = computed(() => !this.tree.hasChildrenLoaded(ROOT_KEY));

  /** Collapses the folder tree to a slim strip, freeing width for the contents table. */
  readonly railCollapsed = signal(false);

  private readonly contextRow = signal<ContentRow | null>(null);

  // --- search across the whole tree, independent of the folder being browsed ---
  readonly searchQuery = signal('');
  readonly searchResults = signal<ReportSearchResult[] | null>(null);
  readonly searching = signal(false);
  private readonly searchInput$ = new Subject<string>();

  readonly homeItem: MenuItem = {
    icon: 'pi pi-home',
    command: () => this.selectFolder(null),
  };

  readonly treeSelectionKeys = computed<Record<string, boolean>>(() => {
    // Depend on the tree structure too: on a deep link the selected node doesn't exist yet when
    // the map is first bound, so emit a fresh reference once the reveal adds it — PrimeNG only
    // re-applies selection when this input's reference changes.
    this.tree.nodes();
    return { [String(this.selectedFolderId() ?? ROOT_KEY)]: true };
  });

  readonly breadcrumbItems = computed<MenuItem[]>(() =>
    this.folderPath().map((folder) => ({
      label: folder.name,
      command: () => this.selectFolder(folder.id),
    })),
  );

  readonly folderRows = computed<FolderRow[]>(() =>
    (this.foldersResource.hasValue() ? this.foldersResource.value() : []).map(folderToRow),
  );
  readonly reportRows = computed<ReportRow[]>(() =>
    (this.reportsResource.hasValue() ? this.reportsResource.value() : []).map(reportToRow),
  );
  readonly hasContent = computed(() => this.folderRows().length + this.reportRows().length > 0);

  readonly contextMenuItems = computed<MenuItem[]>(() => {
    const row = this.contextRow();
    if (!row) return [];
    return [
      { label: 'Open', icon: 'pi pi-external-link', command: () => this.openRow(row) },
      { label: 'Rename', icon: 'pi pi-pencil', command: () => this.rename(row) },
      { label: 'Move', icon: 'pi pi-arrows-alt', command: () => this.move(row) },
      { label: 'Sharing', icon: 'pi pi-users', command: () => this.permissions(row) },
      { separator: true },
      { label: 'Delete', icon: 'pi pi-trash', command: () => this.remove(row) },
    ];
  });

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) return of(null);
          this.searching.set(true);
          return this.reportApi.search(trimmed);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.searching.set(false);
      });

    // Fold each contents fetch into the tree so an expanded node stays in step with the table —
    // and, at the root, so this single fetch populates the tree's root level too (no separate
    // request). Gated on hasValue(): skips the in-flight default (merging its empty list would
    // blank the tree and drop its loading skeleton before the real folders land) and skips an
    // error state (reading .value() there would throw).
    effect(() => {
      if (!this.foldersResource.hasValue()) return;
      const folders = this.foldersResource.value();
      untracked(() => this.tree.merge(String(this.selectedFolderId() ?? ROOT_KEY), folders));
    });

    // Expand the tree down to the selected folder, so a shared deep link lands with the folder
    // revealed in the rail — not just its contents shown on the right.
    effect(() => {
      if (!this.pathResource.hasValue()) return;
      const path = this.pathResource.value();
      untracked(() => this.tree.revealPath(path));
    });
  }

  /**
   * Kicks off the initial tree load; called from the page's ngOnInit. At the root, the contents
   * fetch already loads the top-level folders and the effect above folds them into the tree, so a
   * second identical request would be wasteful. Only a deep link — where the contents fetch is
   * aimed at a nested folder — needs the root level fetched on its own, since revealing the path
   * only walks the ancestors between the root and the target.
   */
  init(): void {
    if (this.selectedFolderId() !== null) {
      this.tree.fetchChildren(null, ROOT_KEY);
    }
  }

  // --- selection ----------------------------------------------------------

  onNodeSelect(event: TreeNodeSelectEvent): void {
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
  selectFolder(id: number | null): void {
    this.clearSearch();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folderId: id },
      queryParamsHandling: 'merge',
    });
  }

  private reload(): void {
    this.foldersResource.reload();
    this.reportsResource.reload();
  }

  // --- search -------------------------------------------------------------

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set(null);
  }

  openSearchResult(result: ReportSearchResult): void {
    this.router.navigate(['/reports', result.id]);
  }

  // --- tree rail ----------------------------------------------------------

  toggleRail(): void {
    this.railCollapsed.update((collapsed) => !collapsed);
  }

  // --- row actions --------------------------------------------------------

  openRow(row: ContentRow): void {
    if (row.kind === 'folder') this.selectFolder(row.id);
    else this.router.navigate(['/reports', row.id]);
  }

  /** Arms the shared context menu for a row; the shell component then shows the overlay. */
  prepareContextMenu(row: ContentRow): void {
    this.contextRow.set(row);
  }

  private rename(row: ContentRow): void {
    this.actions.rename(row).subscribe(() => {
      this.reload();
      this.notify.success(`${this.label(row)} renamed.`);
    });
  }

  private move(row: ContentRow): void {
    this.actions.move(row).subscribe((destination) => {
      this.reload();
      if (destination !== this.selectedFolderId()) this.tree.refreshNodeIfPresent(destination);
      this.notify.success(`${this.label(row)} moved.`);
    });
  }

  private permissions(row: ContentRow): void {
    // Changing sharing can change what's visible, so refresh the contents if anything was saved.
    this.actions.permissions(row).subscribe((changed) => {
      if (changed) this.reload();
    });
  }

  private remove(row: ContentRow): void {
    this.actions.remove(row).subscribe({
      next: () => {
        this.reload();
        this.notify.success(`${this.label(row)} deleted.`);
      },
      error: (err: { status?: number }) => {
        this.notify.error(
          err?.status === 409
            ? 'That folder still has folders or reports in it — empty it first.'
            : 'Something went wrong deleting that.',
        );
      },
    });
  }

  // --- create -------------------------------------------------------------

  openCreateDialog(): void {
    this.actions.create(this.selectedFolderId()).subscribe((outcome) => {
      if (outcome.kind === 'folder') {
        this.reload();
        this.notify.success('Folder created.');
      } else {
        this.router.navigate(['/reports', outcome.reportId, 'edit']);
      }
    });
  }

  /** "Folder" or "Report", capitalised, for a toast about a row action. */
  private label(row: ContentRow): string {
    return row.kind === 'folder' ? 'Folder' : 'Report';
  }
}
