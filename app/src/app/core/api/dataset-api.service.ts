import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { DatasetData, DatasetSchema, DatasetSummary } from '../models/dataset.model';

@Service()
export class DatasetApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<DatasetSummary[]> {
    return this.http.get<DatasetSummary[]>('/api/datasets');
  }

  getSchema(id: string): Observable<DatasetSchema> {
    return this.http.get<DatasetSchema>(`/api/datasets/${id}/schema`);
  }

  getData(id: string): Observable<DatasetData> {
    return this.http.get<DatasetData>(`/api/datasets/${id}/data`);
  }
}
