import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, filter } from 'rxjs';
import { ReportViewFilters } from './report-view-filters';
import { SharedLinkState } from './shared-link-state';
import { ReportViewerStore } from '../report-viewer.store';
import { ViewFilterSchemas } from './view-filter-schemas';
import { SavedViewFilters } from './saved-view-filters';
import { SharedViewLink } from './shared-view-link';
import { NotificationService } from '../../../core/services/notification.service';
import { ViewFilterOverrideCodec } from './view-filter-override-codec';
import { ReportRevisionContent } from '../../../core/models/report';
import { StartingState } from './starting-state';

/**
 * The reader's filters for the report on screen. They start from a shared link's (`?view=<id>`),
 * else the reader's saved ones, else the published ones. Only the reader's own edits are saved: a
 * link's filters apply to that visit until they change something or choose "Save as mine".
 */
@Injectable()
export class ViewFilterSession {
  private static readonly SETTLE_MS = 300;
  public readonly viewFilters = signal<ReportViewFilters | null>(null);

  public readonly sharedLink = computed<SharedLinkState | null>(() => {
    const origin = this.linkOrigin();
    const filters = this.viewFilters();
    return origin && filters ? { ...origin, missingColumns: filters.missingColumnCount() } : null;
  });

  /** Only the first fetch: later refetches keep the viewer up. */
  public readonly loading = computed(
    () => this.viewFilters() === null && (this.saved.loading() || this.link.loading()),
  );

  private readonly store = inject(ReportViewerStore);
  private readonly schemas = inject(ViewFilterSchemas);
  private readonly saved = inject(SavedViewFilters);
  private readonly link = inject(SharedViewLink);
  private readonly notify = inject(NotificationService);
  private readonly linkOrigin = signal<Pick<SharedLinkState, 'total' | 'unmatched'> | null>(null);

  /** Undefined until ready: not "none", which would clear what was saved. */
  private readonly encodedFilters = computed(() => {
    const filters = this.viewFilters();
    return filters?.ready() ? ViewFilterOverrideCodec.encode(filters.snapshot()) : undefined;
  });

  private builtFor: ReportRevisionContent | null = null;
  /** The last seeded, applied or saved state; a settled state that differs is an edit. */
  private editBaseline: string | null = null;
  private missingReportedFor: ReportViewFilters | null = null;

  constructor() {
    this.seedPerVersion();
    this.applyLinkChanges();
    this.rebaselineWhenReady();
    this.warnAboutMissingColumns();
    this.saveEdits();
  }

  /** Makes a shared link's filters the reader's own. */
  public saveLinkAsMine(): void {
    const encoded = this.encodedFilters();
    if (encoded === undefined) {
      return;
    }
    if (this.saved.failed()) {
      this.notify.error(
        "Couldn't save these filters because your saved filters didn't load. Reload and try again.",
      );
      return;
    }
    this.commit(encoded);
  }

  /** Leaves a shared link's filters for the reader's own saved (or the published) ones. */
  public discardLink(): void {
    const filters = this.viewFilters();
    if (!filters) {
      return;
    }
    this.link.drop();
    filters.apply(ViewFilterOverrideCodec.decode(this.saved.encoded() ?? null) ?? {});
    this.editBaseline = ViewFilterOverrideCodec.encode(filters.snapshot());
    this.linkOrigin.set(null);
  }

  public copyLink(): Promise<void> {
    const filters = this.viewFilters();
    return this.link.copy(filters ? ViewFilterOverrideCodec.encode(filters.snapshot()) : null);
  }

  /** Seeds fresh filters per version once their starting point loads, so widgets load once. */
  private seedPerVersion(): void {
    effect(() => {
      const content = this.store.content();
      const ready = this.saved.settled() && this.link.settled();
      untracked(() => this.seed(content, ready));
    });
  }

  /** A `view` change from outside (back/forward) re-applies; that isn't an edit, so it isn't saved. */
  private applyLinkChanges(): void {
    effect(() => {
      this.link.id();
      const ready = this.saved.settled() && this.link.settled();
      untracked(() => {
        const filters = this.viewFilters();
        if (!filters || !ready || this.link.isApplied()) {
          return;
        }
        const start = this.startingState();
        filters.apply(start.overrides);
        this.settle(filters, start);
      });
    });
  }

  private rebaselineWhenReady(): void {
    effect(() => {
      const filters = this.viewFilters();
      if (!filters?.ready()) {
        return;
      }
      untracked(() => {
        this.editBaseline = ViewFilterOverrideCodec.encode(filters.snapshot());
      });
    });
  }

  /** Warns once about conditions on removed columns; a link's banner covers its own. */
  private warnAboutMissingColumns(): void {
    effect(() => {
      const filters = this.viewFilters();
      const missing = filters?.missingColumnCount() ?? 0;
      const fromLink = this.linkOrigin() !== null;
      untracked(() => {
        if (!filters || missing === 0 || fromLink || this.missingReportedFor === filters) {
          return;
        }
        this.missingReportedFor = filters;
        this.notify.warn(
          missing === 1
            ? 'One of your filters uses a column that no longer exists, so it was left out.'
            : `${missing} of your filters use columns that no longer exist, so they were left out.`,
        );
      });
    });
  }

  private saveEdits(): void {
    toObservable(this.encodedFilters)
      .pipe(
        filter((encoded) => encoded !== undefined),
        debounceTime(ViewFilterSession.SETTLE_MS),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const encoded = this.encodedFilters();
        if (encoded !== undefined && encoded !== this.editBaseline) {
          this.commit(encoded);
        }
      });
  }

  private startingState(): StartingState {
    const lookupFailed = this.link.lookupFailed();
    if (this.link.id()) {
      const encoded = this.link.filters();
      const overrides = encoded ? ViewFilterOverrideCodec.decode(encoded) : null;
      if (overrides) {
        return { overrides, fromLink: true, lookupFailed: false };
      }

      this.notify.warn(
        lookupFailed
          ? "This link's filters couldn't be loaded, so your own are shown. Reload to try again."
          : "This link's filters couldn't be found, so your own are shown.",
      );
    }
    // Saved filters that no longer decode are dropped quietly: the reader didn't just hand them over, unlike a link.
    const overrides = ViewFilterOverrideCodec.decode(this.saved.encoded() ?? null) ?? {};
    return { overrides, fromLink: false, lookupFailed };
  }

  /** Records what was just applied as "not yet edited", and what the banner should say. */
  private settle(filters: ReportViewFilters, start: StartingState): void {
    this.editBaseline = ViewFilterOverrideCodec.encode(filters.snapshot());
    if (start.fromLink) {
      this.link.markApplied(this.link.id());
      this.linkOrigin.set({
        total: Object.keys(start.overrides).length,
        unmatched: filters.unmatched(start.overrides).length,
      });
    } else {
      this.linkOrigin.set(null);
      // A failed fetch keeps `?view=` so a reload retries; a missing snapshot drops it.
      if (start.lookupFailed) {
        this.link.markApplied(this.link.id());
      } else {
        this.link.drop();
      }
    }
    this.saved.reportFailure();
  }

  private commit(encoded: string | null): void {
    this.editBaseline = encoded;
    this.linkOrigin.set(null);
    this.link.drop();
    this.saved.save(encoded);
  }

  private seed(content: ReportRevisionContent | null, ready: boolean): void {
    if (!content) {
      this.builtFor = null;
      this.viewFilters.set(null);
      return;
    }
    this.schemas.load(content);
    // Already built for this version: a later `view` change is applyLinkChanges'.
    if (content === this.builtFor) {
      return;
    }
    if (!ready) {
      this.viewFilters.set(null);
      return;
    }
    this.build(content);
  }

  private build(content: ReportRevisionContent): void {
    this.builtFor = content;
    const start = this.startingState();
    const filters = new ReportViewFilters(
      content,
      this.schemas.schemas,
      this.schemas.catalogue,
      start.overrides,
    );
    this.viewFilters.set(filters);
    this.settle(filters, start);
    this.store.openFilterKey.set(null);
  }
}
