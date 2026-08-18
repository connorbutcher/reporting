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

  /** The datasets owned by a report's checked-out draft revision. */
  listForReport(reportId: number): Observable<DatasetSummary[]> {
    return this.http.get<DatasetSummary[]>(`/api/reports/${reportId}/datasets`);
  }

  getSchema(id: number): Observable<DatasetSchema> {
    return this.http.get<DatasetSchema>(`/api/datasets/${id}/schema`);
  }

  getData(id: number): Observable<DatasetData> {
    return this.http.get<DatasetData>(`/api/datasets/${id}/data`);
  }

  /**
   * Rows matching a filter. Filtering runs in SQL, so a widget never pulls rows
   * it isn't going to show.
   */
  query(id: number, filter: FilterGroup | null): Observable<DatasetQueryResult> {
    return this.http.post<DatasetQueryResult>(`/api/datasets/${id}/query`, { filter });
  }

  /**
   * A page of rows shaped for a table widget: filtered, sorted, and paged
   * server-side, with each cell already formatted and tolerance-classified.
   */
  queryTable(id: number, request: TableQueryRequest): Observable<TableQueryResult> {
    return this.http.post<TableQueryResult>(`/api/datasets/${id}/table-query`, request);
  }

  /**
   * Rows shaped for a chart widget: filtered, grouped into series, and paired
   * with resolved tolerance bounds and pre-formatted tooltip lines.
   */
  queryChart(id: number, request: ChartQueryRequest): Observable<ChartQueryResult> {
    return this.http.post<ChartQueryResult>(`/api/datasets/${id}/chart-query`, request);
  }

  /**
   * Rows shaped for a bar chart: filtered, grouped by the category column, and
   * reduced to one value per category (per series) by the chosen aggregate.
   */
  queryBarChart(id: number, request: BarChartQueryRequest): Observable<BarChartQueryResult> {
    return this.http.post<BarChartQueryResult>(`/api/datasets/${id}/bar-chart-query`, request);
  }

  updateColumnConfiguration(
    datasetId: number,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(
      `/api/datasets/${datasetId}/columns/${columnId}/configuration`,
      configuration,
    );
  }

  // --- dataset management ---------------------------------------------------

  /** Creates a dataset on a report's draft revision. */
  create(reportId: number, name: string): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>(`/api/reports/${reportId}/datasets`, { name });
  }

  rename(id: number, name: string): Observable<DatasetSummary> {
    return this.http.put<DatasetSummary>(`/api/datasets/${id}`, { name });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${id}`);
  }

  addColumn(datasetId: number, name: string, type: DatasetColumnType): Observable<DatasetColumn> {
    return this.http.post<DatasetColumn>(`/api/datasets/${datasetId}/columns`, { name, type });
  }

  updateColumn(
    datasetId: number,
    columnId: string,
    name: string,
    type: DatasetColumnType,
  ): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(`/api/datasets/${datasetId}/columns/${columnId}`, { name, type });
  }

  removeColumn(datasetId: number, columnId: string): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${datasetId}/columns/${columnId}`);
  }

  reorderColumns(datasetId: number, columnIds: string[]): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${datasetId}/columns/order`, { columnIds });
  }

  addRow(datasetId: number, values: Record<string, string>): Observable<DatasetRow> {
    return this.http.post<DatasetRow>(`/api/datasets/${datasetId}/rows`, { values });
  }

  updateRow(datasetId: number, rowId: string, values: Record<string, string>): Observable<DatasetRow> {
    return this.http.put<DatasetRow>(`/api/datasets/${datasetId}/rows/${rowId}`, { values });
  }

  removeRow(datasetId: number, rowId: string): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${datasetId}/rows/${rowId}`);
  }
}
