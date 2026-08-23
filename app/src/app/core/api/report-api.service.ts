import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ReportRevisionContent,
  ReportSearchResult,
  ReportSummary,
  ReportVersionSummary,
} from '../models/report';

@Service()
export class ReportApiService {
  private readonly http = inject(HttpClient);

  /** Every report across every folder, flat — only meant for things that need the full tree at once, like the "copy from" picker. */
  listAll(): Observable<ReportSummary[]> {
    return this.http.get<ReportSummary[]>('/api/reports/all');
  }

  /** Finds reports anywhere in the tree by name or report number (e.g. "42" or "R-42"). */
  search(query: string): Observable<ReportSearchResult[]> {
    return this.http.get<ReportSearchResult[]>('/api/reports/search', { params: { q: query } });
  }

  create(name: string, folderId: number | null, sourceReportId?: number): Observable<ReportSummary> {
    return this.http.post<ReportSummary>('/api/reports', { name, folderId, sourceReportId });
  }

  rename(id: number, name: string, folderId: number | null): Observable<ReportSummary> {
    return this.http.put<ReportSummary>(`/api/reports/${id}`, { name, folderId });
  }

  move(id: number, folderId: number | null, name: string): Observable<ReportSummary> {
    return this.rename(id, name, folderId);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}`);
  }

  getDraft(id: number): Observable<ReportRevisionContent> {
    return this.http.get<ReportRevisionContent>(`/api/reports/${id}/draft`);
  }

  /** Checks out a draft to edit; idempotent if one is already checked out. */
  checkout(id: number, fromVersionNumber?: number): Observable<ReportRevisionContent> {
    return this.http.post<ReportRevisionContent>(`/api/reports/${id}/draft`, { fromVersionNumber });
  }

  updateDraft(id: number, content: ReportRevisionContent): Observable<ReportRevisionContent> {
    return this.http.put<ReportRevisionContent>(`/api/reports/${id}/draft`, content);
  }

  publish(id: number, notes: string | null): Observable<ReportVersionSummary> {
    return this.http.post<ReportVersionSummary>(`/api/reports/${id}/draft/publish`, { notes });
  }

  discardDraft(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}/draft`);
  }
}
