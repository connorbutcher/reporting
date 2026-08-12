import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TreeModule, TreeNodeSelectEvent } from 'primeng/tree';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { Folder } from '../../core/models/folder.model';
import { ReportSearchResult, ReportSummary } from '../../core/models/report.model';
import { ContentRow, folderToRow, reportToRow } from './content-row';
import { ROOT_KEY, FolderTreeStore } from './folder-tree.store';
import { HomeItemActionsService } from './home-item-actions.service';

const SEARCH_DEBOUNCE_MS = 300;

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
  providers: [HomeItemActionsService],
})
export class HomePageComponent implements OnInit {
  private readonly folderApi = inject(FolderApiService);
  private readonly reportApi = inject(ReportApiService);
  private readonly router = inject(Router);
  private readonly actions = inject(HomeItemActionsService);

  protected readonly tree = new FolderTreeStore(this.folderApi);

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

  protected readonly homeItem: MenuItem = {
    icon: 'pi pi-home',
    command: () => this.selectFolder(null),
  };

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
    this.contentFolders().map(folderToRow),
  );
  protected readonly reportRows = computed<ContentRow[]>(() =>
    this.contentReports().map(reportToRow),
  );
  protected readonly hasContent = computed(
    () => this.folderRows().length + this.reportRows().length > 0,
  );

  protected readonly contextMenuItems = computed<MenuItem[]>(() => {
    const row = this.contextRow();
    if (!row) return [];
    return [
      { label: 'Open', icon: 'pi pi-external-link', command: () => this.openRow(row) },
      { label: 'Rename', icon: 'pi pi-pencil', command: () => this.rename(row) },
      { label: 'Move', icon: 'pi pi-arrows-alt', command: () => this.move(row) },
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
  }

  ngOnInit(): void {
    this.treeLoading.set(true);
    this.tree.fetchChildren(null, ROOT_KEY).add(() => this.treeLoading.set(false));

    this.selectFolder(null);
  }

  // --- selection & content loading ---------------------------------------

  protected onNodeSelect(event: TreeNodeSelectEvent): void {
    const key = event.node.key;
    this.selectFolder(key === ROOT_KEY || !key ? null : key);
  }

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
      this.tree.merge(folderId ?? ROOT_KEY, folders);
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

  private rename(row: ContentRow): void {
    this.actions.rename(row).subscribe(() => this.reload());
  }

  private move(row: ContentRow): void {
    this.actions.move(row).subscribe((destination) => {
      this.reload();
      if (destination !== this.selectedFolderId()) this.tree.refreshNodeIfPresent(destination);
    });
  }

  private remove(row: ContentRow): void {
    this.actions.remove(row).subscribe({
      next: () => this.reload(),
      error: (err: { status?: number }) => {
        this.errorMessage.set(
          err?.status === 409
            ? 'That folder still has folders or reports in it — empty it first.'
            : 'Something went wrong deleting that.',
        );
      },
    });
  }

  // --- create -------------------------------------------------------------

  protected openCreateDialog(): void {
    this.actions.create(this.selectedFolderId()).subscribe((outcome) => {
      if (outcome.kind === 'folder') this.reload();
      else this.router.navigate(['/reports', outcome.reportId, 'edit']);
    });
  }
}
