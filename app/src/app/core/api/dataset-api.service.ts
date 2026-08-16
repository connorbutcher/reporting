import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DatasetColumn,
  DatasetColumnConfiguration,
  DatasetColumnType,
  DatasetData,
  DatasetRow,
  DatasetSchema,
  DatasetSummary,
} from '../models/dataset.model';
import { DatasetQueryResult, FilterGroup } from '../models/filter.model';
import {
  BarChartQueryRequest,
  BarChartQueryResult,
  ChartQueryRequest,
  ChartQueryResult,
  TableQueryRequest,
  TableQueryResult,
} from '../models/widget-query.model';

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

  /**
   * Rows matching a filter. Filtering runs in SQL, so a widget never pulls rows
   * it isn't going to show.
   */
  query(id: string, filter: FilterGroup | null): Observable<DatasetQueryResult> {
    return this.http.post<DatasetQueryResult>(`/api/datasets/${id}/query`, { filter });
  }

  /**
   * A page of rows shaped for a table widget: filtered, sorted, and paged
   * server-side, with each cell already formatted and tolerance-classified.
   */
  queryTable(id: string, request: TableQueryRequest): Observable<TableQueryResult> {
    return this.http.post<TableQueryResult>(`/api/datasets/${id}/table-query`, request);
  }

  /**
   * Rows shaped for a chart widget: filtered, grouped into series, and paired
   * with resolved tolerance bounds and pre-formatted tooltip lines.
   */
  queryChart(id: string, request: ChartQueryRequest): Observable<ChartQueryResult> {
    return this.http.post<ChartQueryResult>(`/api/datasets/${id}/chart-query`, request);
  }

  /**
   * Rows shaped for a bar chart: filtered, grouped by the category column, and
   * reduced to one value per category (per series) by the chosen aggregate.
   */
  queryBarChart(id: string, request: BarChartQueryRequest): Observable<BarChartQueryResult> {
    return this.http.post<BarChartQueryResult>(`/api/datasets/${id}/bar-chart-query`, request);
  }

  updateColumnConfiguration(
    datasetId: string,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(
      `/api/datasets/${datasetId}/columns/${columnId}/configuration`,
      configuration,
    );
  }

  // --- dataset management ---------------------------------------------------

  create(name: string): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>('/api/datasets', { name });
  }

  rename(id: string, name: string): Observable<DatasetSummary> {
    return this.http.put<DatasetSummary>(`/api/datasets/${id}`, { name });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${id}`);
  }

  addColumn(datasetId: string, name: string, type: DatasetColumnType): Observable<DatasetColumn> {
    return this.http.post<DatasetColumn>(`/api/datasets/${datasetId}/columns`, { name, type });
  }

  updateColumn(
    datasetId: string,
    columnId: string,
    name: string,
    type: DatasetColumnType,
  ): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(`/api/datasets/${datasetId}/columns/${columnId}`, { name, type });
  }

  removeColumn(datasetId: string, columnId: string): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${datasetId}/columns/${columnId}`);
  }

  reorderColumns(datasetId: string, columnIds: string[]): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${datasetId}/columns/order`, { columnIds });
  }

  addRow(datasetId: string, values: Record<string, string>): Observable<DatasetRow> {
    return this.http.post<DatasetRow>(`/api/datasets/${datasetId}/rows`, { values });
  }

  updateRow(datasetId: string, rowId: string, values: Record<string, string>): Observable<DatasetRow> {
    return this.http.put<DatasetRow>(`/api/datasets/${datasetId}/rows/${rowId}`, { values });
  }

  removeRow(datasetId: string, rowId: string): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${datasetId}/rows/${rowId}`);
  }
}
