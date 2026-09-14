import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Folder } from '../../core/models/folder.model';
import { ReportSummary } from '../../core/models/report';
import { FolderRow, ReportRow, folderToRow, reportToRow } from './content-row';
import { ROOT_KEY, FolderTreeStore } from './folder-tree.store';

/**
 * The selected folder's contents and breadcrumb path, plus the account-wide Favourites and
 * Recently-viewed lists — pulled out of {@link HomeStore} so it only owns navigation and row
 * actions. Also keeps the folder tree ({@link FolderTreeStore}) in sync: every contents fetch
 * folds its folders into the tree, and every path fetch reveals the tree down to it, since both
 * are side effects of the same navigation this store already reacts to.
 *
 * A component-provided collaborator — constructed by Angular DI, not `new`'d — so its
 * {@link ActivatedRoute} resolves to the home route and its lifetime is tied to the page.
 */
@Injectable()
export class HomeContentsStore {
  /** null means the root folder — represented by the absence of the `folderId` query param. */
  public readonly selectedFolderId = computed<number | null>(() => {
    const raw = this.queryParams().get('folderId');
    return raw ? Number(raw) : null;
  });

  // Guarded with hasValue(): httpResource's .value() throws once a resource is in its error
  // state, defaultValue notwithstanding — reading it unguarded (as this used to) took the whole
  // page down on a 404/403 from any of these three endpoints, e.g. a stale or permission-denied
  // folder link.
  public readonly folderPath = computed(() =>
    this.pathResource.hasValue() ? this.pathResource.value() : [],
  );
  public readonly loading = computed(
    () => this.foldersResource.isLoading() || this.reportsResource.isLoading(),
  );
  /** True once the selected folder's contents or path failed to load — doesn't exist, or no access. */
  public readonly error = computed(
    () =>
      this.foldersResource.error() != null ||
      this.reportsResource.error() != null ||
      this.pathResource.error() != null,
  );

  public readonly folderRows = computed<FolderRow[]>(() =>
    (this.foldersResource.hasValue() ? this.foldersResource.value() : []).map(folderToRow),
  );
  public readonly reportRows = computed<ReportRow[]>(() =>
    (this.reportsResource.hasValue() ? this.reportsResource.value() : []).map(reportToRow),
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

  /** The URL is the source of truth for which folder is open, so a link deep into the tree is shareable. */
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
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

  // Personal, whole-account state — independent of the folder being browsed, so it's fetched once
  // and surfaced in the nav rail's Favourites/Recent regardless of which folder is open. Reloaded
  // after any action that could change it: starring, and the row actions that can add/remove/hide a report.
  private readonly favoritesResource = httpResource<ReportSummary[]>(() => '/api/me/favorites', {
    defaultValue: [],
  });
  private readonly recentResource = httpResource<ReportSummary[]>(
    () => ({ url: '/api/me/recent', params: { take: '8' } }),
    { defaultValue: [] },
  );

  constructor() {
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
  public init(): void {
    if (this.selectedFolderId() !== null) {
      this.tree.fetchChildren(null, ROOT_KEY);
    }
  }

  public reload(): void {
    this.foldersResource.reload();
    this.reportsResource.reload();
    this.reloadPersonal();
  }

  /** Refetches the Favourites and Recently-viewed strips — after starring, or an action that reshapes a report. */
  public reloadPersonal(): void {
    this.favoritesResource.reload();
    this.recentResource.reload();
  }

  /** Stars or un-stars a report, then refreshes the strips and the contents table so its star updates. */
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
