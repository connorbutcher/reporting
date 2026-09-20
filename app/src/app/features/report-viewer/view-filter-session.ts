import { DOCUMENT, Location } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, catchError, concatMap, debounceTime, filter, firstValueFrom, map } from 'rxjs';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import { FilterApiService } from '../../core/api/filter-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { DatasetSchema } from '../../core/models/dataset';
import { OperatorCatalogue } from '../../core/models/filter';
import {
  ReportRevisionContent,
  ReportSharedView,
  ReportViewFiltersState,
  readChartBindings,
} from '../../core/models/report';
import { isChartWidget } from '../../core/models/widget-catalog';
import { NotificationService } from '../../core/services/notification.service';
import { ReportViewFilters } from './report-view-filters';
import { ReportViewerStore } from './report-viewer.store';
import {
  ViewFilterOverrides,
  decodeViewFilterOverrides,
  encodeViewFilterOverrides,
} from './view-filter-overrides';

/** How long filter edits settle before they're saved, so typing a value isn't one request per key. */
const FILTERS_SETTLE_MS = 300;

/** What the viewer's banner needs to say about a shared link's filters the reader hasn't yet made their own. */
export interface SharedLinkState {
  /** How many filters (one per filtered widget or dataset) the link carried. */
  readonly total: number;
  /** How many of those name a widget or dataset this version of the report doesn't have, so were left out. */
  readonly unmatched: number;
}

/**
 * The reader's filters for the report on screen: where they start, and keeping them.
 *
 * They start from, in order, a shared link's filters (`?view=<short id>` — the URL carries only the
 * id, never filter data), the reader's own saved filters, or the published ones. Only the reader's
 * own *edits* are saved: opening a link applies its filters for that visit and leaves what they'd
 * saved alone, until they change something (or choose "Save as mine"). Sharing turns the current
 * filters into a short id on the server ({@link copyLink}).
 */
@Injectable()
export class ViewFilterSession {
  /** The filters layered over the published ones; rebuilt per version. Null until they can be seeded. */
  public readonly viewFilters = signal<ReportViewFilters | null>(null);

  /** Set while the reader is looking at a shared link's filters they haven't edited or saved. */
  public readonly sharedLink = signal<SharedLinkState | null>(null);

  /** True while the very first filters are still being fetched — not on later refetches, which keep the viewer up. */
  public readonly loading = computed(
    () => this.viewFilters() === null && (this.savedResource.isLoading() || this.sharedResource.isLoading()),
  );

  private readonly store = inject(ReportViewerStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportApi = inject(ReportApiService);
  private readonly datasetApi = inject(DatasetApiService);
  private readonly filterApi = inject(FilterApiService);
  private readonly notify = inject(NotificationService);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);

  /** Schemas and operators the filter panel needs to describe each column. */
  private readonly schemas = signal<Record<string, DatasetSchema>>({});
  private readonly catalogue = signal<OperatorCatalogue | null>(null);

  /** The `view` query param: the short id of a shared snapshot the URL asks for, or null. */
  private readonly viewParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('view'))),
    { initialValue: this.route.snapshot.queryParamMap.get('view') },
  );

  private readonly savedResource = httpResource<ReportViewFiltersState>(() =>
    this.store.reportId() ? `/api/reports/${this.store.reportId()}/view-filters` : undefined,
  );
  /**
   * The encoded filters the reader has saved for this report: undefined until loaded (or if that
   * failed), null when they have none. Writable so a save updates it — otherwise a later rebuild
   * (switching version) would read the stale fetch and bring back filters they'd since cleared.
   */
  private readonly savedParam = linkedSignal<string | null | undefined>(() =>
    this.savedResource.hasValue() ? this.savedResource.value().filters : undefined,
  );
  private readonly savedSettled = computed(
    () => this.savedResource.hasValue() || this.savedResource.error() != null,
  );

  private readonly sharedResource = httpResource<ReportSharedView>(() => {
    const reportId = this.store.reportId();
    const viewId = this.viewParam();
    return reportId && viewId
      ? `/api/reports/${reportId}/shared-views/${encodeURIComponent(viewId)}`
      : undefined;
  });
  /** The snapshot for the id the URL names now — not a stale one from the id before it. */
  private readonly sharedView = computed(() =>
    this.sharedResource.hasValue() && this.sharedResource.value().id === this.viewParam()
      ? this.sharedResource.value()
      : null,
  );
  /** Whether what the URL asks for has arrived (or failed): nothing to wait for when it asks for nothing. */
  private readonly sharedSettled = computed(
    () => !this.viewParam() || this.sharedView() !== null || this.sharedResource.error() != null,
  );

  /**
   * The reader's changes as their compact encoding (null when there are none), or undefined while
   * no filters exist yet — which must not be mistaken for "none" and clear what they'd saved.
   */
  private readonly encodedFilters = computed(() => {
    const filters = this.viewFilters();
    return filters ? encodeViewFilterOverrides(filters.snapshot()) : undefined;
  });

  /** Saves and clears are queued so two quick edits reach the server in order. */
  private readonly saves = new Subject<{ reportId: number; filters: string | null }>();

  /** The version the current filters were built for, so a later change to the URL applies rather than rebuilds. */
  private builtFor: ReportRevisionContent | null = null;

  /**
   * The `view` param the filters currently reflect. A param that differs came from outside
   * (back/forward) and is applied; one that matches is just the URL catching up with what we did.
   */
  private syncedViewParam: string | null = null;

  /**
   * The encoded filters as last seeded, applied or saved — what "the reader hasn't edited since"
   * looks like. A settled state that differs from it is the reader's own change, and gets saved;
   * one that matches (a link's filters just opened, saved ones just loaded) is not.
   */
  private editBaseline: string | null = null;

  constructor() {
    this.filterApi
      .operators()
      .pipe(takeUntilDestroyed())
      .subscribe((catalogue) => this.catalogue.set(catalogue));

    // Reader edits reach the server in the order they were made; a failed save is reported but
    // leaves the queue running.
    this.saves
      .pipe(
        concatMap(({ reportId, filters }) =>
          (filters
            ? this.reportApi.saveViewFilters(reportId, filters)
            : this.reportApi.clearViewFilters(reportId)
          ).pipe(
            catchError((err) => {
              this.notify.apiError(err, "Couldn't save your filters. Please try again.");
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();

    // A new version to show means a fresh set of filters, seeded per startingState() (entries naming
    // a widget this version lacks are dropped), and schemas to name its columns. Seeding waits for
    // the saved filters and any shared link, so widgets don't load unfiltered and then reload.
    effect(() => {
      const content = this.store.content();
      const ready = this.savedSettled() && this.sharedSettled();
      untracked(() => {
        if (content) this.loadSchemas(content);
        if (!content) {
          this.builtFor = null;
          this.viewFilters.set(null);
          return;
        }
        // Already built for this version: a later change to the `view` param is the next effect's.
        if (content === this.builtFor) return;
        if (!ready) {
          this.viewFilters.set(null);
          return;
        }

        this.builtFor = content;
        const start = this.startingState();
        const filters = new ReportViewFilters(
          content,
          this.schemas.asReadonly(),
          this.catalogue.asReadonly(),
          start.overrides,
        );
        this.viewFilters.set(filters);
        this.settle(filters, start);
        this.store.openFilterKey.set(null);
      });
    });

    // The `view` param changing from outside (back/forward) re-applies its filters. What's applied
    // isn't an edit, so it isn't saved.
    effect(() => {
      const viewParam = this.viewParam();
      const ready = this.savedSettled() && this.sharedSettled();
      untracked(() => {
        const filters = this.viewFilters();
        if (!filters || !ready || viewParam === this.syncedViewParam) return;
        const start = this.startingState();
        filters.apply(start.overrides);
        this.settle(filters, start);
      });
    });

    // Once the reader's edits settle they're saved.
    toObservable(this.encodedFilters)
      .pipe(
        filter((encoded) => encoded !== undefined),
        debounceTime(FILTERS_SETTLE_MS),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.saveIfEdited());
  }

  /** Keeps a shared link's filters as the reader's own: saves them, and the link stops being what they're looking at. */
  public saveLinkAsMine(): void {
    const encoded = this.encodedFilters();
    if (encoded !== undefined) this.commit(encoded);
  }

  /** Leaves a shared link's filters behind for the reader's own saved (or the published) ones. */
  public discardLink(): void {
    const filters = this.viewFilters();
    if (!filters) return;
    this.dropViewParam();
    filters.apply(decodeViewFilterOverrides(this.savedParam() ?? null) ?? {});
    this.editBaseline = encodeViewFilterOverrides(filters.snapshot());
    this.sharedLink.set(null);
  }

  /**
   * Copies a link to this report with the reader's filters (and open tab) in it. The filters go to
   * the server, which answers with a short id, so the link carries only that id — never the filters.
   */
  public async copyLink(): Promise<void> {
    const reportId = this.store.reportId();
    if (reportId === null) return;

    let viewId: string | null = null;
    const encoded = this.encodedFilters();
    if (encoded) {
      try {
        viewId = (await firstValueFrom(this.reportApi.createSharedView(reportId, encoded))).id;
      } catch (err) {
        this.notify.apiError(err, "Couldn't create the link. Please try again.");
        return;
      }
    }

    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { view: viewId },
      queryParamsHandling: 'merge',
    });
    const url = new URL(
      this.location.prepareExternalUrl(this.router.serializeUrl(tree)),
      this.document.location.origin,
    ).toString();

    try {
      await this.document.defaultView!.navigator.clipboard.writeText(url);
      this.notify.success('Link copied to the clipboard.');
    } catch {
      this.notify.error("Couldn't copy the link to the clipboard.");
    }
  }

  /**
   * Where the reader's filters start: a shared link's, when the URL names one — they apply to this
   * visit only, and nothing is saved until the reader edits; otherwise what they last saved;
   * otherwise (an empty result) the published ones.
   */
  private startingState(): { overrides: ViewFilterOverrides; fromLink: boolean } {
    if (this.viewParam()) {
      const encoded = this.sharedView()?.filters;
      const overrides = encoded ? decodeViewFilterOverrides(encoded) : null;
      if (overrides) return { overrides, fromLink: true };
      this.notify.warn("This link's filters couldn't be found, so your own are shown.");
    }
    // Saved filters that no longer decode (the encoding moved on) are dropped without a word:
    // unlike a link, the reader didn't just hand them to us.
    return { overrides: decodeViewFilterOverrides(this.savedParam() ?? null) ?? {}, fromLink: false };
  }

  /** Records what was just applied as "not yet edited", and works out what the banner should say. */
  private settle(filters: ReportViewFilters, start: { overrides: ViewFilterOverrides; fromLink: boolean }): void {
    this.editBaseline = encodeViewFilterOverrides(filters.snapshot());
    if (start.fromLink) {
      this.syncedViewParam = this.viewParam();
      this.sharedLink.set({
        total: Object.keys(start.overrides).length,
        unmatched: filters.unmatched(start.overrides).length,
      });
    } else {
      this.sharedLink.set(null);
      // A link that couldn't be read falls back to the reader's own filters; its param goes too.
      this.syncedViewParam = null;
      this.dropViewParam();
    }
  }

  private saveIfEdited(): void {
    const encoded = this.encodedFilters();
    if (encoded === undefined || encoded === this.editBaseline) return;
    this.commit(encoded);
  }

  /**
   * Makes the current filters the reader's own: saved (or cleared, when back on the published ones),
   * and no longer "from a link" — the link's id no longer describes what they're looking at.
   */
  private commit(encoded: string | null): void {
    const reportId = this.store.reportId();
    if (reportId === null) return;
    this.editBaseline = encoded;
    this.savedParam.set(encoded);
    this.sharedLink.set(null);
    this.dropViewParam();
    this.saves.next({ reportId, filters: encoded });
  }

  /** Removes the `view` param, replacing the history entry, once it no longer describes the filters. */
  private dropViewParam(): void {
    if (!this.viewParam()) return;
    this.syncedViewParam = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: null },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }

  /** Fetches a schema per dataset the version uses, so the filter panel can name columns. */
  private loadSchemas(content: ReportRevisionContent): void {
    const datasetIds = new Set<number>();
    for (const widget of content.tabs.flatMap((t) => t.widgets)) {
      if (widget.type === 'dataTable') {
        if (widget.config.datasetId) datasetIds.add(widget.config.datasetId);
      } else if (isChartWidget(widget)) {
        // A chart can overlay several datasets — one per binding — all needed here.
        for (const binding of readChartBindings(widget.config)) {
          if (binding.datasetId) datasetIds.add(binding.datasetId);
        }
      }
    }

    for (const datasetId of datasetIds) {
      if (this.schemas()[datasetId]) continue;
      this.datasetApi.getSchema(datasetId).subscribe((schema) => {
        this.schemas.update((all) => ({ ...all, [datasetId]: schema }));
      });
    }
  }
}
