import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpErrorNotification } from '../http/http-error-notification.interceptor';
import {
  ReportRevisionContent,
  ReportSearchResult,
  ReportSharedView,
  ReportSummary,
  ReportVersionSummary,
} from '../models/report';
import { CreateWidgetComment } from '../models/widget-comment/create-widget-comment.model';
import { WidgetComment } from '../models/widget-comment/widget-comment.model';

@Service()
export class ReportApiService {
  private readonly http = inject(HttpClient);

  /** Every report across every folder, flat — only meant for things that need the full tree at once, like the "copy from" picker. */
  public listAll(): Observable<ReportSummary[]> {
    return this.http.get<ReportSummary[]>('/api/reports/all');
  }

  // The caller (HomeSearchStore) shows its own failure message, so this opts out of the global toast.
  /** Finds reports anywhere in the tree by name or report number (e.g. "42" or "R-42"). */
  public search(query: string): Observable<ReportSearchResult[]> {
    return this.http.get<ReportSearchResult[]>('/api/reports/search', {
      params: { q: query },
      context: HttpErrorNotification.skip(),
    });
  }

  /** The reports the current user has starred. */
  public favorites(): Observable<ReportSummary[]> {
    return this.http.get<ReportSummary[]>('/api/me/favorites');
  }

  /** The current user's most-recently-opened reports, newest first. */
  public recent(take = 8): Observable<ReportSummary[]> {
    return this.http.get<ReportSummary[]>('/api/me/recent', { params: { take } });
  }

  /** Stars (favorite=true) or un-stars (false) a report for the current user. */
  public setFavorite(id: number, favorite: boolean): Observable<void> {
    return favorite
      ? this.http.post<void>(`/api/reports/${id}/favorite`, {})
      : this.http.delete<void>(`/api/reports/${id}/favorite`);
  }

  /** Records that the current user just opened a report, for their "recently viewed" list. Fire-and-forget: failures are swallowed, so it opts out of the global error toast. */
  public recordView(id: number): Observable<void> {
    return this.http.post<void>(
      `/api/reports/${id}/view`,
      {},
      { context: HttpErrorNotification.skip() },
    );
  }

  /** Saves the current user's viewing filters (the viewer's encoded string), replacing any earlier. */
  public saveViewFilters(id: number, filters: string): Observable<void> {
    return this.http.put<void>(`/api/reports/${id}/view-filters`, { filters });
  }

  /** Forgets the current user's saved viewing filters. */
  public clearViewFilters(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}/view-filters`);
  }

  /** Shares viewing filters, returning the short id a link carries instead of them (the same id for the same filters). */
  public createSharedView(id: number, filters: string): Observable<ReportSharedView> {
    return this.http.post<ReportSharedView>(`/api/reports/${id}/shared-views`, { filters });
  }

  /** A widget's comments, newest first. */
  public getWidgetComments(reportId: number, widgetId: string): Observable<WidgetComment[]> {
    return this.http.get<WidgetComment[]>(`/api/reports/${reportId}/widgets/${widgetId}/comments`);
  }

  public postWidgetComment(
    reportId: number,
    widgetId: string,
    comment: CreateWidgetComment,
  ): Observable<WidgetComment> {
    return this.http.post<WidgetComment>(
      `/api/reports/${reportId}/widgets/${widgetId}/comments`,
      comment,
    );
  }

  /** Unguarded beyond having posted it, like clearing saved filters: a user can always remove their own. */
  public deleteWidgetComment(
    reportId: number,
    widgetId: string,
    commentId: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `/api/reports/${reportId}/widgets/${widgetId}/comments/${commentId}`,
    );
  }

  /** Every widget's comment count on this report, for the viewer's footer pills — one request, not one per widget. */
  public getCommentCounts(reportId: number): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`/api/reports/${reportId}/comment-counts`);
  }

  public create(
    name: string,
    folderId: number | null,
    sourceReportId?: number,
  ): Observable<ReportSummary> {
    return this.http.post<ReportSummary>('/api/reports', { name, folderId, sourceReportId });
  }

  public rename(id: number, name: string, folderId: number | null): Observable<ReportSummary> {
    return this.http.put<ReportSummary>(`/api/reports/${id}`, { name, folderId });
  }

  public move(id: number, folderId: number | null, name: string): Observable<ReportSummary> {
    return this.rename(id, name, folderId);
  }

  public remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}`);
  }

  public getDraft(id: number): Observable<ReportRevisionContent> {
    return this.http.get<ReportRevisionContent>(`/api/reports/${id}/draft`);
  }

  /** Checks out a draft to edit; idempotent if one is already checked out. */
  public checkout(id: number, fromVersionNumber?: number): Observable<ReportRevisionContent> {
    return this.http.post<ReportRevisionContent>(`/api/reports/${id}/draft`, { fromVersionNumber });
  }

  public updateDraft(
    id: number,
    content: ReportRevisionContent,
  ): Observable<ReportRevisionContent> {
    return this.http.put<ReportRevisionContent>(`/api/reports/${id}/draft`, content);
  }

  public publish(id: number, notes: string | null): Observable<ReportVersionSummary> {
    return this.http.post<ReportVersionSummary>(`/api/reports/${id}/draft/publish`, { notes });
  }

  public discardDraft(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}/draft`);
  }
}
