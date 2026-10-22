import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Folder } from '../../core/models/folder/folder.model';
import { ReportSummary } from '../../core/models/report';
import { FolderRow } from './models/folder-row';
import { ReportRow } from './models/report-row';
import { ContentRows } from './content-rows';
import { FolderTreeStore } from './folder-tree.store';

/**
 * The open folder's contents and breadcrumb, plus Favourites and Recent. Keeps the folder tree in
 * step with each fetch. Provided at the page so it uses the home route.
 */
@Injectable()
export class HomeContentsStore {
  /** Null is the root, which has no `folderId` param. */
  public readonly selectedFolderId = computed<number | null>(() => {
    const raw = this.queryParams().get('folderId');
    return raw ? Number(raw) : null;
  });

  // Guarded with hasValue(): httpResource's value() throws in its error state, which took the page
  // down on a stale or denied folder link.
  public readonly folderPath = computed(() =>
    this.pathResource.hasValue() ? this.pathResource.value() : [],
  );
  public readonly loading = computed(
    () => this.foldersResource.isLoading() || this.reportsResource.isLoading(),
  );
  public readonly error = computed(
    () =>
      this.foldersResource.error() != null ||
      this.reportsResource.error() != null ||
      this.pathResource.error() != null,
  );

  // Server order is by id, which isn't meaningful to browse by.
  public readonly folderRows = computed<FolderRow[]>(() =>
    (this.foldersResource.hasValue() ? this.foldersResource.value() : [])
      .map(ContentRows.fromFolder)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  public readonly reportRows = computed<ReportRow[]>(() =>
    (this.reportsResource.hasValue() ? this.reportsResource.value() : [])
      .map(ContentRows.fromReport)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  public readonly hasContent = computed(
    () => this.folderRows().length + this.reportRows().length > 0,
  );

  public readonly favorites = computed<ReportSummary[]>(() =>
    this.favoritesResource.hasValue() ? this.favoritesResource.value() : [],
  );
  public readonly recent = computed<ReportSummary[]>(() =>
    this.recentResource.hasValue() ? this.recentResource.value() : [],
  );

  private readonly folderApi = inject(FolderApiService);
  private readonly reportApi = inject(ReportApiService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly tree = inject(FolderTreeStore);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  private readonly foldersResource = httpResource<Folder[]>(
    () => {
      const id = this.selectedFolderId();
      const params: Record<string, string> = {};
      if (id !== null) {
        params['parentId'] = String(id);
      }
      return { url: '/api/folders/children', params };
    },
    { defaultValue: [] },
  );
  private readonly reportsResource = httpResource<ReportSummary[]>(
    () => {
      const id = this.selectedFolderId();
      const params: Record<string, string> = {};
      if (id !== null) {
        params['folderId'] = String(id);
      }
      return { url: '/api/reports', params };
    },
    { defaultValue: [] },
  );
  private readonly pathResource = httpResource<Folder[]>(
    () => (this.selectedFolderId() ? `/api/folders/${this.selectedFolderId()}/path` : undefined),
    { defaultValue: [] },
  );

  // Account-wide, so fetched once and reloaded after actions that can change it.
  private readonly favoritesResource = httpResource<ReportSummary[]>(() => '/api/me/favorites', {
    defaultValue: [],
  });
  private readonly recentResource = httpResource<ReportSummary[]>(
    () => ({ url: '/api/me/recent', params: { take: '8' } }),
    { defaultValue: [] },
  );

  constructor() {
    // Folds each fetch into the tree (at the root this also fills its top level). Skips the in-flight
    // default, which would blank the tree, and the error state, which would throw.
    effect(() => {
      if (!this.foldersResource.hasValue()) {
        return;
      }
      const folders = this.foldersResource.value();
      untracked(() =>
        this.tree.merge(String(this.selectedFolderId() ?? FolderTreeStore.ROOT_KEY), folders),
      );
    });

    // Reveals the selected folder in the rail for deep links.
    effect(() => {
      if (!this.pathResource.hasValue()) {
        return;
      }
      const path = this.pathResource.value();
      untracked(() => this.tree.revealPath(path));
    });
  }

  /**
   * Called from ngOnInit. At the root the contents fetch already loads the top level, so only a deep
   * link fetches it separately.
   */
  public init(): void {
    if (this.selectedFolderId() !== null) {
      this.tree.fetchChildren(null, FolderTreeStore.ROOT_KEY);
    }
  }

  public reload(): void {
    this.foldersResource.reload();
    this.reportsResource.reload();
    this.reloadPersonal();
  }

  public reloadPersonal(): void {
    this.favoritesResource.reload();
    this.recentResource.reload();
  }

  public toggleFavorite(report: ReportSummary): void {
    this.reportApi.setFavorite(report.id, !report.isFavorite).subscribe({
      next: () => {
        this.reloadPersonal();
        this.reportsResource.reload();
      },
      error: (err) =>
        this.notify.apiError(err, "Couldn't update your favourites. Please try again."),
    });
  }
}
