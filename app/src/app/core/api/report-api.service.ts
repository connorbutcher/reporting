import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Report } from '../models/report.model';

@Service()
export class ReportApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<Report[]> {
    return this.http.get<Report[]>('/api/reports');
  }

  get(id: string): Observable<Report> {
    return this.http.get<Report>(`/api/reports/${id}`);
  }

  create(name: string): Observable<Report> {
    return this.http.post<Report>('/api/reports', { name });
  }

  update(report: Report): Observable<Report> {
    return this.http.put<Report>(`/api/reports/${report.id}`, report);
  }
}
