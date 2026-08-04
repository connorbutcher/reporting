import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportRevisionContent, ReportSummary, ReportVersionSummary } from '../models/report.model';

@Service()
export class ReportApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<ReportSummary[]> {
    return this.http.get<ReportSummary[]>('/api/reports');
  }

  get(id: string): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`/api/reports/${id}`);
  }

  create(name: string, folderId: string | null): Observable<ReportSummary> {
    return this.http.post<ReportSummary>('/api/reports', { name, folderId });
  }

  rename(id: string, name: string, folderId: string | null): Observable<ReportSummary> {
    return this.http.put<ReportSummary>(`/api/reports/${id}`, { name, folderId });
  }

  move(id: string, folderId: string | null, name: string): Observable<ReportSummary> {
    return this.rename(id, name, folderId);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}`);
  }

  getVersions(id: string): Observable<ReportVersionSummary[]> {
    return this.http.get<ReportVersionSummary[]>(`/api/reports/${id}/versions`);
  }

  getVersion(id: string, versionNumber: number): Observable<ReportRevisionContent> {
    return this.http.get<ReportRevisionContent>(`/api/reports/${id}/versions/${versionNumber}`);
  }

  getDraft(id: string): Observable<ReportRevisionContent> {
    return this.http.get<ReportRevisionContent>(`/api/reports/${id}/draft`);
  }

  /** Checks out a draft to edit; idempotent if one is already checked out. */
  checkout(id: string, fromVersionNumber?: number): Observable<ReportRevisionContent> {
    return this.http.post<ReportRevisionContent>(`/api/reports/${id}/draft`, { fromVersionNumber });
  }

  updateDraft(id: string, content: ReportRevisionContent): Observable<ReportRevisionContent> {
    return this.http.put<ReportRevisionContent>(`/api/reports/${id}/draft`, content);
  }

  publish(id: string, notes: string | null): Observable<ReportVersionSummary> {
    return this.http.post<ReportVersionSummary>(`/api/reports/${id}/draft/publish`, { notes });
  }

  discardDraft(id: string): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}/draft`);
  }
}
