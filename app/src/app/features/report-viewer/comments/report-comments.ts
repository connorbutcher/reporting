import { httpResource } from '@angular/common/http';
import { Injectable, Signal, computed, inject, linkedSignal, signal } from '@angular/core';
import { ReportApiService } from '../../../core/api/report-api.service';
import { DirectoryUser } from '../../../core/models/admin';
import {
  PendingCommentAnchor,
  WidgetComment,
  WidgetCommentAuthor,
} from '../../../core/models/widget-comment.model';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportViewerStore } from '../report-viewer.store';

/** Where a comment on a chart is pinned, shared between the panel and the chart that owns the point. */
export interface CommentAnchorTarget {
  widgetId: string;
  x: number;
  y: number;
  yAxisIndex?: number;
}

/**
 * Comments engineers leave on a widget while viewing a report: the focused widget's thread, the whole
 * report's counts for the footer pills, and the compose/anchor/highlight state a chart widget and the
 * aside's comments panel both need to agree on. One instance per report-viewer screen (see
 * {@link ReportViewerComponent}'s providers), so a chart can inject it directly rather than threading
 * anchor mode and highlighting through inputs/outputs the way the builder's widget outlet does.
 */
@Injectable()
export class ReportComments {
  /** Every comment on the focused widget, newest first. Writable so posting/deleting updates it in place rather than waiting on a refetch. */
  public readonly comments: Signal<WidgetComment[]>;
  public readonly loading: Signal<boolean>;
  public readonly loadFailed: Signal<boolean>;
  /** The people directory for the mention picker, fetched once and kept for the screen's life. */
  public readonly directory: Signal<DirectoryUser[]>;
  /** Every comment on the report, for the aside tab's badge. */
  public readonly totalCount: Signal<number>;
  /** For a chart widget's own anchor fetch, which needs the report id independent of which thread is focused. */
  public readonly reportId: Signal<number | null>;

  /** The widget whose chart is in "click a point to anchor a comment" mode, if any. */
  public readonly anchorModeWidgetId = signal<string | null>(null);
  /** The point picked for the comment being composed. */
  public readonly pendingAnchor = signal<PendingCommentAnchor | null>(null);
  /** The anchor currently drawing attention — a chart's own marker, or a comment's point chip, set either one. */
  public readonly highlightedAnchor = signal<CommentAnchorTarget | null>(null);
  public readonly posting = signal(false);

  private readonly store = inject(ReportViewerStore);
  private readonly api = inject(ReportApiService);
  private readonly notify = inject(NotificationService);

  /** The widget whose thread the panel shows — set by a widget's own comment button. */
  private readonly widgetId = this.store.commentsWidgetId;

  private readonly threadResource = httpResource<WidgetComment[]>(() => {
    const reportId = this.reportId();
    const widgetId = this.widgetId();
    return reportId && widgetId
      ? `/api/reports/${reportId}/widgets/${widgetId}/comments`
      : undefined;
  });
  private readonly thread = linkedSignal<WidgetComment[]>(() =>
    this.threadResource.hasValue() ? this.threadResource.value() : [],
  );

  private readonly countsResource = httpResource<Record<string, number>>(() => {
    const reportId = this.reportId();
    return reportId ? `/api/reports/${reportId}/comment-counts` : undefined;
  });
  private readonly counts = linkedSignal<Record<string, number>>(() =>
    this.countsResource.hasValue() ? this.countsResource.value() : {},
  );

  private readonly directoryResource = httpResource<DirectoryUser[]>(() => '/api/users', {
    defaultValue: [],
  });

  constructor() {
    // Deferred to the constructor, which runs after every field above is initialized: each reads
    // another field (`.asReadonly()`/`.value` are evaluated immediately, not lazily like `computed`),
    // so assigning them inline here would run before `thread`/`directoryResource` exist.
    this.comments = this.thread.asReadonly();
    this.directory = this.directoryResource.value;
    this.loading = computed(() => this.threadResource.isLoading());
    this.loadFailed = computed(() => this.threadResource.error() != null);
    this.totalCount = computed(() => Object.values(this.counts()).reduce((sum, n) => sum + n, 0));
    this.reportId = this.store.reportId;
  }

  /** This widget's comment count, from the bulk fetch — 0 while it's still loading. */
  public countFor(widgetId: string): number {
    return this.counts()[widgetId] ?? 0;
  }

  /** Opens the panel on this widget's thread — a plain comment button, or a chart's anchor toggle/marker. */
  public open(widgetId: string): void {
    this.store.openComments(widgetId);
  }

  /** Toggles "click a point to anchor" for a chart; switching it on for one widget turns it off for any other. */
  public toggleAnchorMode(widgetId: string): void {
    this.anchorModeWidgetId.update((current) => (current === widgetId ? null : widgetId));
    this.pendingAnchor.set(null);
  }

  /** A point was clicked while that widget was in anchor mode: pin the draft comment there and open the panel on it. */
  public pickAnchor(widgetId: string, anchor: PendingCommentAnchor): void {
    this.anchorModeWidgetId.set(null);
    this.pendingAnchor.set(anchor);
    this.open(widgetId);
  }

  public clearPendingAnchor(): void {
    this.pendingAnchor.set(null);
  }

  public highlight(target: CommentAnchorTarget): void {
    this.highlightedAnchor.set(target);
  }

  public clearHighlight(): void {
    this.highlightedAnchor.set(null);
  }

  /** Posts a comment on the focused widget, pinned to {@link pendingAnchor} when one is set. */
  public post(body: string, mentions: readonly WidgetCommentAuthor[]): void {
    const reportId = this.reportId();
    const widgetId = this.widgetId();
    const trimmed = body.trim();
    if (!reportId || !widgetId || !trimmed || this.posting()) {
      return;
    }

    const anchor = this.pendingAnchor();
    this.posting.set(true);
    this.api
      .postWidgetComment(reportId, widgetId, {
        body: trimmed,
        anchorX: anchor?.x,
        anchorY: anchor?.y,
        anchorYAxisIndex: anchor?.yAxisIndex,
        mentionedUserIds: mentions.map((m) => m.id),
      })
      .subscribe({
        next: (comment) => {
          this.posting.set(false);
          this.thread.update((current) => [comment, ...current]);
          this.counts.update((current) => ({
            ...current,
            [widgetId]: (current[widgetId] ?? 0) + 1,
          }));
          this.pendingAnchor.set(null);
        },
        error: (err) => {
          this.posting.set(false);
          this.notify.apiError(err, "Couldn't post your comment. Please try again.");
        },
      });
  }

  public remove(commentId: number): void {
    const reportId = this.reportId();
    const widgetId = this.widgetId();
    if (!reportId || !widgetId) {
      return;
    }

    // Removed from the list right away — deleting your own comment never fails in a way worth waiting on.
    this.thread.update((current) => current.filter((c) => c.id !== commentId));
    this.counts.update((current) => ({
      ...current,
      [widgetId]: Math.max(0, (current[widgetId] ?? 1) - 1),
    }));
    this.api.deleteWidgetComment(reportId, widgetId, commentId).subscribe({
      error: (err) => this.notify.apiError(err, "Couldn't delete that comment. Please try again."),
    });
  }
}
