import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DatasetColumn,
  DatasetColumnConfiguration,
  DatasetColumnType,
  DatasetData,
  DatasetRow,
  DatasetRowWindow,
  DatasetSchema,
  DatasetSource,
  DatasetSourceConfig,
  DatasetSummary,
} from '../models/dataset';
import { DatasetQueryResult, FilterGroup } from '../models/filter';
import {
  BarChartQueryRequest,
  BarChartQueryResult,
  ChartQueryRequest,
  ChartQueryResult,
  TableQueryRequest,
  TableQueryResult,
} from '../models/widget-query';

@Service()
export class DatasetApiService {
  private readonly http = inject(HttpClient);

  /** The fixed set of source systems a dataset can draw from. */
  listSources(): Observable<DatasetSource[]> {
    return this.http.get<DatasetSource[]>('/api/dataset-sources');
  }

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
   * A window of a dataset's rows for the editor grid's lazy virtual scroll:
   * `count` rows from `first`, plus the total row count. Keeps a large dataset
   * from loading into the editor all at once.
   */
  getRowWindow(id: number, first: number, count: number): Observable<DatasetRowWindow> {
    return this.http.get<DatasetRowWindow>(
      `/api/datasets/${id}/rows?first=${first}&count=${count}`,
    );
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

  /** Creates a dataset on a report's draft revision, drawing from the given source. */
  create(reportId: number, name: string, sourceId: number): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>(`/api/reports/${reportId}/datasets`, { name, sourceId });
  }

  rename(id: number, name: string): Observable<DatasetSummary> {
    return this.http.put<DatasetSummary>(`/api/datasets/${id}`, { name });
  }

  /** Deep-copies a dataset (columns, rows and data) within its report's draft, under a new name. */
  clone(id: number, name: string): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>(`/api/datasets/${id}/clone`, { name });
  }

  /** Repoints a dataset at a different source; its config resets to that source's default. */
  setSource(id: number, sourceId: number): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${id}/source`, { sourceId });
  }

  /** Replaces a dataset's source configuration; the config's source must match the dataset's. */
  updateSourceConfig(id: number, config: DatasetSourceConfig): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${id}/source-config`, config);
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
