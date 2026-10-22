import { Injectable, Signal, computed, inject, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { WidgetComment } from '../../../core/models/widget-comment/widget-comment.model';
import { DirectoryUser } from '../../../core/models/admin';
import { PendingCommentAnchor } from '../../../core/models/widget-comment/pending-comment-anchor.model';
import { CommentAnchorTarget } from './comment-anchor-target';
import { ReportViewerStore } from '../report-viewer.store';
import { ReportApiService } from '../../../core/api/report-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WidgetCommentAuthor } from '../../../core/models/widget-comment/widget-comment-author.model';

/**
 * Widget comments for the viewer: the focused thread, report counts, and the anchor and highlight
 * state a chart and the comments panel share. One per viewer screen, so charts inject it directly.
 */
@Injectable()
export class ReportComments {
  /** Newest first. Writable so posts and deletes update in place. */
  public readonly comments: Signal<WidgetComment[]>;
  public readonly loading: Signal<boolean>;
  public readonly loadFailed: Signal<boolean>;
  public readonly directory: Signal<DirectoryUser[]>;
  public readonly totalCount: Signal<number>;
  public readonly reportId: Signal<number | null>;

  public readonly anchorModeWidgetId = signal<string | null>(null);
  public readonly pendingAnchor = signal<PendingCommentAnchor | null>(null);
  public readonly highlightedAnchor = signal<CommentAnchorTarget | null>(null);
  public readonly posting = signal(false);

  private readonly store = inject(ReportViewerStore);
  private readonly api = inject(ReportApiService);
  private readonly notify = inject(NotificationService);

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
    // Assigned here because they read fields declared above eagerly.
    this.comments = this.thread.asReadonly();
    this.directory = this.directoryResource.value;
    this.loading = computed(() => this.threadResource.isLoading());
    this.loadFailed = computed(() => this.threadResource.error() != null);
    this.totalCount = computed(() => Object.values(this.counts()).reduce((sum, n) => sum + n, 0));
    this.reportId = this.store.reportId;
  }

  public countFor(widgetId: string): number {
    return this.counts()[widgetId] ?? 0;
  }

  public open(widgetId: string): void {
    this.store.openComments(widgetId);
  }

  /** Toggles anchor mode for one chart, turning it off for any other. */
  public toggleAnchorMode(widgetId: string): void {
    this.anchorModeWidgetId.update((current) => (current === widgetId ? null : widgetId));
    this.pendingAnchor.set(null);
  }

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
