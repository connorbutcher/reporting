import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { MenuItem, TreeNode } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TreeModule, TreeNodeExpandEvent, TreeNodeSelectEvent } from 'primeng/tree';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { Folder } from '../../core/models/folder.model';
import { ReportSearchResult, ReportSummary } from '../../core/models/report.model';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog/confirm-dialog.component';
import { CreateDialogComponent, CreateDialogResult } from './create-dialog/create-dialog.component';
import { MoveDialogComponent, MoveDialogData } from './move-dialog/move-dialog.component';
import { RenameDialogComponent, RenameDialogData } from './rename-dialog/rename-dialog.component';

/** Key used for the synthetic root node, since folder ids are never this string. */
const ROOT_KEY = '__root__';
const SEARCH_DEBOUNCE_MS = 300;

/** A folder or report, normalized to one shape so both can share row-action logic (open/rename/move/delete). */
interface ContentRow {
  kind: 'folder' | 'report';
  id: string;
  name: string;
  number: number | null;
  status: string | null;
  /** Drives the status stripe/text colour on a report row. Null for folders. */
  statusKind: 'draft' | 'published' | 'empty' | null;
  modifiedAt: string;
  folder?: Folder;
  report?: ReportSummary;
}

@Component({
  selector: 'app-home-page',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    TreeModule,
    BreadcrumbModule,
    TableModule,
    ContextMenuModule,
    SkeletonModule,
    InputTextModule,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  private readonly folderApi = inject(FolderApiService);
  private readonly reportApi = inject(ReportApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  /** null means the root folder. */
  protected readonly selectedFolderId = signal<string | null>(null);
  protected readonly folderPath = signal<Folder[]>([]);

  protected readonly contentFolders = signal<Folder[]>([]);
  protected readonly contentReports = signal<ReportSummary[]>([]);
  protected readonly contentsLoading = signal(true);
  protected readonly treeLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Collapses the folder tree to a slim strip, freeing width for the contents table. */
  protected readonly railCollapsed = signal(false);

  protected readonly contextRow = signal<ContentRow | null>(null);

  // --- search across the whole tree, independent of the folder being browsed ---
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<ReportSearchResult[] | null>(null);
  protected readonly searching = signal(false);
  private readonly searchInput$ = new Subject<string>();

  // --- lazy tree state ------------------------------------------------------
  // The tree is rebuilt fresh from these signals on every change, rather than
  // mutating shared TreeNode objects in place — PrimeNG's Tree only reliably
  // picks up structural changes (new children appearing under a node) when it
  // receives genuinely new node objects, not an existing tree with properties
  // patched on it.
  /** Every folder we've learned about so far, from any children fetch. */
  private readonly knownFolders = signal<Map<string, Folder>>(new Map());
  /** Child folder ids already fetched for each parent key (ROOT_KEY or a folder id). */
  private readonly childrenOf = signal<Map<string, string[]>>(new Map());
  private readonly expandedKeys = signal<Set<string>>(new Set([ROOT_KEY]));
  private readonly loadingKeys = signal<Set<string>>(new Set());

  protected readonly treeNodes = computed<TreeNode[]>(() => [
    this.buildTreeNode(ROOT_KEY, 'Home', 'pi pi-home', true),
  ]);

  protected readonly homeItem: MenuItem = { icon: 'pi pi-home', command: () => this.selectFolder(null) };

  protected readonly treeSelectionKeys = computed<Record<string, boolean>>(() => ({
    [this.selectedFolderId() ?? ROOT_KEY]: true,
  }));

  protected readonly breadcrumbItems = computed<MenuItem[]>(() =>
    this.folderPath().map((folder) => ({
      label: folder.name,
      command: () => this.selectFolder(folder.id),
    })),
  );

  protected readonly folderRows = computed<ContentRow[]>(() =>
    this.contentFolders().map(
      (folder): ContentRow => ({
        kind: 'folder',
        id: folder.id,
        name: folder.name,
        number: null,
        status: null,
        statusKind: null,
        modifiedAt: folder.modifiedAt,
        folder,
      }),
    ),
  );

  protected readonly reportRows = computed<ContentRow[]>(() =>
    this.contentReports().map((report): ContentRow => {
      const statusKind = report.hasDraft ? 'draft' : report.latestVersionNumber ? 'published' : 'empty';
      return {
        kind: 'report',
        id: report.id,
        name: report.name,
        number: report.number,
        status: report.hasDraft
          ? 'Draft'
          : report.latestVersionNumber
            ? `Published · v${report.latestVersionNumber}`
            : 'No versions',
        statusKind,
        modifiedAt: report.modifiedAt,
        report,
      };
    }),
  );

  protected readonly hasContent = computed(() => this.folderRows().length + this.reportRows().length > 0);

  protected readonly contextMenuItems = computed<MenuItem[]>(() => {
    const row = this.contextRow();
    if (!row) return [];
    return [
      { label: 'Open', icon: 'pi pi-external-link', command: () => this.openRow(row) },
      { label: 'Rename', icon: 'pi pi-pencil', command: () => this.openRenameDialog(row) },
      { label: 'Move', icon: 'pi pi-arrows-alt', command: () => this.openMoveDialog(row) },
      { separator: true },
      { label: 'Delete', icon: 'pi pi-trash', command: () => this.openDeleteConfirm(row) },
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
  }

  ngOnInit(): void {
    this.treeLoading.set(true);
    this.fetchTreeChildren(null, ROOT_KEY).add(() => this.treeLoading.set(false));

    this.selectFolder(null);
  }

  // --- lazy tree --------------------------------------------------------

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

  private fetchTreeChildren(parentId: string | null, key: string) {
    this.loadingKeys.update((s) => new Set(s).add(key));
    return this.folderApi.children(parentId).subscribe((children) => {
      this.mergeIntoTree(key, children);
      this.loadingKeys.update((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    });
  }

  /** Folds a children fetch into the tree's known state — shared by expand, initial load, and post-mutation refreshes. */
  private mergeIntoTree(key: string, children: Folder[]): void {
    this.knownFolders.update((m) => {
      const next = new Map(m);
      for (const folder of children) next.set(folder.id, folder);
      return next;
    });
    this.childrenOf.update((m) => new Map(m).set(key, children.map((f) => f.id)));
  }

  protected onNodeExpand(event: TreeNodeExpandEvent): void {
    const key = event.node?.key;
    if (!key) return;
    this.expandedKeys.update((s) => new Set(s).add(key));
    if (this.childrenOf().has(key)) return;
    this.fetchTreeChildren(key === ROOT_KEY ? null : key, key);
  }

  protected onNodeSelect(event: TreeNodeSelectEvent): void {
    const key = event.node.key;
    this.selectFolder(key === ROOT_KEY || !key ? null : key);
  }

  /** Refreshes a folder's tree entry from the server — for a folder other than the one just loaded via `loadContents`. */
  private refreshTreeNodeIfPresent(folderId: string | null): void {
    const key = folderId ?? ROOT_KEY;
    if (!this.childrenOf().has(key)) return;
    this.folderApi.children(folderId).subscribe((children) => this.mergeIntoTree(key, children));
  }

  // --- selection & content loading ---------------------------------------

  protected selectFolder(id: string | null): void {
    this.selectedFolderId.set(id);
    this.loadContents(id);
    this.loadPath(id);
  }

  private loadContents(folderId: string | null): void {
    this.contentsLoading.set(true);
    forkJoin({
      folders: this.folderApi.children(folderId),
      reports: this.reportApi.list(folderId),
    }).subscribe(({ folders, reports }) => {
      this.contentFolders.set(folders);
      this.contentReports.set(reports);
      this.contentsLoading.set(false);
      this.mergeIntoTree(folderId ?? ROOT_KEY, folders);
    });
  }

  private loadPath(folderId: string | null): void {
    if (folderId === null) {
      this.folderPath.set([]);
      return;
    }
    this.folderApi.path(folderId).subscribe((path) => this.folderPath.set(path));
  }

  private reload(): void {
    this.loadContents(this.selectedFolderId());
  }

  // --- search -------------------------------------------------------------

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set(null);
  }

  protected openSearchResult(result: ReportSearchResult): void {
    this.router.navigate(['/reports', result.id]);
  }

  // --- tree rail ----------------------------------------------------------

  protected toggleRail(): void {
    this.railCollapsed.update((collapsed) => !collapsed);
  }

  // --- row actions ------------------------------------------------------

  protected openRow(row: ContentRow): void {
    if (row.kind === 'folder') this.selectFolder(row.id);
    else this.router.navigate(['/reports', row.id]);
  }

  protected onTableContextMenuSelect(event: { data: ContentRow }): void {
    this.errorMessage.set(null);
    this.contextRow.set(event.data);
  }

  protected onRowActionsClick(event: MouseEvent, row: ContentRow, cm: ContextMenu): void {
    event.stopPropagation();
    this.errorMessage.set(null);
    this.contextRow.set(row);
    cm.show(event);
  }

  /** Folder chips aren't p-table rows, so right-click needs its own wiring to the shared context menu. */
  protected onFolderContextMenu(event: MouseEvent, row: ContentRow, cm: ContextMenu): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.contextRow.set(row);
    cm.show(event);
  }

  private openRenameDialog(row: ContentRow): void {
    const ref = this.dialog.open<string | undefined>(RenameDialogComponent, {
      data: { kind: row.kind, currentName: row.name } satisfies RenameDialogData,
    });
    ref.closed.subscribe((newName) => {
      if (!newName) return;
      if (row.kind === 'folder') {
        this.folderApi.rename(row.id, newName, row.folder!.parentFolderId).subscribe(() => this.reload());
      } else {
        this.reportApi.rename(row.id, newName, row.report!.folderId).subscribe(() => this.reload());
      }
    });
  }

  private openMoveDialog(row: ContentRow): void {
    const currentFolderId = row.kind === 'folder' ? row.folder!.parentFolderId : row.report!.folderId;
    this.folderApi.list().subscribe((allFolders) => {
      const ref = this.dialog.open<string | null | undefined>(MoveDialogComponent, {
        data: {
          kind: row.kind,
          itemName: row.name,
          folders: allFolders,
          currentFolderId,
          excludeSubtreeOf: row.kind === 'folder' ? row.id : undefined,
        } satisfies MoveDialogData,
      });
      ref.closed.subscribe((destination) => {
        if (destination === undefined) return;
        const onDone = () => {
          this.reload();
          if (destination !== this.selectedFolderId()) this.refreshTreeNodeIfPresent(destination);
        };
        if (row.kind === 'folder') {
          this.folderApi.move(row.id, destination, row.name).subscribe(onDone);
        } else {
          this.reportApi.move(row.id, destination, row.name).subscribe(onDone);
        }
      });
    });
  }

  private openDeleteConfirm(row: ContentRow): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      data: {
        title: `Delete ${row.kind}`,
        message:
          row.kind === 'folder'
            ? `Delete "${row.name}"? The folder must be empty. This can't be undone.`
            : `Delete "${row.name}"? This removes all of its versions and can't be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe((confirmed) => {
      if (!confirmed) return;
      const request = row.kind === 'folder' ? this.folderApi.remove(row.id) : this.reportApi.remove(row.id);
      request.subscribe({
        next: () => this.reload(),
        error: (err: { status?: number }) => {
          this.errorMessage.set(
            err?.status === 409
              ? 'That folder still has folders or reports in it — empty it first.'
              : 'Something went wrong deleting that.',
          );
        },
      });
    });
  }

  // --- create -------------------------------------------------------------

  protected openCreateDialog(): void {
    const ref = this.dialog.open<CreateDialogResult | undefined>(CreateDialogComponent);
    ref.closed.subscribe((result) => {
      if (!result) return;
      if (result.kind === 'folder') this.createFolder(result.name);
      else this.createReport(result.name);
    });
  }

  private createFolder(name: string): void {
    this.folderApi.create(name, this.selectedFolderId()).subscribe(() => this.reload());
  }

  private createReport(name: string): void {
    this.reportApi.create(name, this.selectedFolderId()).subscribe((report) => {
      this.router.navigate(['/reports', report.id, 'edit']);
    });
  }
}
