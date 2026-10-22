import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpErrorNotification } from '../http/http-error-notification.interceptor';
import {
  ColumnTypeImpact,
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
import { DatasetCountResult, DatasetQueryResult, FilterGroup } from '../models/filter';
import {
  BarChartQueryRequest,
  BarChartQueryResult,
  BoxPlotQueryRequest,
  BoxPlotQueryResult,
  ChartQueryRequest,
  ChartQueryResult,
  HistogramQueryRequest,
  HistogramQueryResult,
  KpiQueryRequest,
  KpiQueryResult,
  PivotQueryRequest,
  PivotQueryResult,
  TableQueryRequest,
  TableQueryResult,
  XBarRChartQueryRequest,
  XBarRChartQueryResult,
} from '../models/widget-query';

@Service()
export class DatasetApiService {
  private readonly http = inject(HttpClient);

  public listSources(): Observable<DatasetSource[]> {
    return this.http.get<DatasetSource[]>('/api/dataset-sources');
  }

  /** Datasets on the report's checked-out draft. */
  public listForReport(reportId: number): Observable<DatasetSummary[]> {
    return this.http.get<DatasetSummary[]>(`/api/reports/${reportId}/datasets`);
  }

  public getSchema(id: number): Observable<DatasetSchema> {
    return this.http.get<DatasetSchema>(`/api/datasets/${id}/schema`);
  }

  public getData(id: number): Observable<DatasetData> {
    return this.http.get<DatasetData>(`/api/datasets/${id}/data`);
  }

  /** `count` rows from `first` plus the total, for the editor grid's virtual scroll. */
  public getRowWindow(id: number, first: number, count: number): Observable<DatasetRowWindow> {
    return this.http.get<DatasetRowWindow>(
      `/api/datasets/${id}/rows?first=${first}&count=${count}`,
    );
  }

  public query(id: number, filter: FilterGroup | null): Observable<DatasetQueryResult> {
    return this.http.post<DatasetQueryResult>(`/api/datasets/${id}/query`, { filter });
  }

  /** Match and total counts only, so the filter panel can recount on each edit. */
  public countMatches(id: number, filter: FilterGroup | null): Observable<DatasetCountResult> {
    return this.http.post<DatasetCountResult>(`/api/datasets/${id}/count`, { filter });
  }

  /** Filtered, sorted and paged server-side, with cells formatted and tolerance-classified. */
  public queryTable(id: number, request: TableQueryRequest): Observable<TableQueryResult> {
    return this.http.post<TableQueryResult>(`/api/datasets/${id}/table-query`, request);
  }

  /** Every matched row (up to the server's cap), for a CSV export. */
  public exportTable(id: number, request: TableQueryRequest): Observable<TableQueryResult> {
    return this.http.post<TableQueryResult>(`/api/datasets/${id}/table-export`, request);
  }

  public queryChart(id: number, request: ChartQueryRequest): Observable<ChartQueryResult> {
    return this.http.post<ChartQueryResult>(`/api/datasets/${id}/chart-query`, request);
  }

  public queryBarChart(id: number, request: BarChartQueryRequest): Observable<BarChartQueryResult> {
    return this.http.post<BarChartQueryResult>(`/api/datasets/${id}/bar-chart-query`, request);
  }

  public queryBoxPlot(id: number, request: BoxPlotQueryRequest): Observable<BoxPlotQueryResult> {
    return this.http.post<BoxPlotQueryResult>(`/api/datasets/${id}/box-plot-query`, request);
  }

  public queryXBarRChart(
    id: number,
    request: XBarRChartQueryRequest,
  ): Observable<XBarRChartQueryResult> {
    return this.http.post<XBarRChartQueryResult>(`/api/datasets/${id}/xbar-r-chart-query`, request);
  }

  public queryHistogram(
    id: number,
    request: HistogramQueryRequest,
  ): Observable<HistogramQueryResult> {
    return this.http.post<HistogramQueryResult>(`/api/datasets/${id}/histogram-query`, request);
  }

  public queryPivot(id: number, request: PivotQueryRequest): Observable<PivotQueryResult> {
    return this.http.post<PivotQueryResult>(`/api/datasets/${id}/pivot-query`, request);
  }

  public queryKpi(id: number, request: KpiQueryRequest): Observable<KpiQueryResult> {
    return this.http.post<KpiQueryResult>(`/api/datasets/${id}/kpi-query`, request);
  }

  /** A column's distinct values for filter dropdowns, ordered and capped; `search` narrows them. */
  public columnValues(datasetId: number, columnId: string, search?: string): Observable<string[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<string[]>(`/api/datasets/${datasetId}/columns/${columnId}/values`, {
      params,
    });
  }

  public updateColumnConfiguration(
    datasetId: number,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(
      `/api/datasets/${datasetId}/columns/${columnId}/configuration`,
      configuration,
    );
  }

  public create(reportId: number, name: string, sourceId: number): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>(`/api/reports/${reportId}/datasets`, { name, sourceId });
  }

  public rename(id: number, name: string): Observable<DatasetSummary> {
    return this.http.put<DatasetSummary>(`/api/datasets/${id}`, { name });
  }

  /** Deep-copies columns and rows under a new name. */
  public clone(id: number, name: string): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>(`/api/datasets/${id}/clone`, { name });
  }

  /** The config resets to the new source's default. */
  public setSource(id: number, sourceId: number): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${id}/source`, { sourceId });
  }

  public updateSourceConfig(id: number, config: DatasetSourceConfig): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${id}/source-config`, config);
  }

  public remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${id}`);
  }

  public addColumn(
    datasetId: number,
    name: string,
    type: DatasetColumnType,
  ): Observable<DatasetColumn> {
    return this.http.post<DatasetColumn>(`/api/datasets/${datasetId}/columns`, { name, type });
  }

  /** Advisory, so failures are left to the caller rather than toasted. */
  public columnTypeImpact(
    datasetId: number,
    columnId: string,
    type: DatasetColumnType,
  ): Observable<ColumnTypeImpact> {
    return this.http.get<ColumnTypeImpact>(
      `/api/datasets/${datasetId}/columns/${columnId}/type-impact`,
      {
        params: new HttpParams().set('type', type),
        context: HttpErrorNotification.skip(),
      },
    );
  }

  public updateColumn(
    datasetId: number,
    columnId: string,
    name: string,
    type: DatasetColumnType,
  ): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(`/api/datasets/${datasetId}/columns/${columnId}`, {
      name,
      type,
    });
  }

  public removeColumn(datasetId: number, columnId: string): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${datasetId}/columns/${columnId}`);
  }

  public reorderColumns(datasetId: number, columnIds: string[]): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${datasetId}/columns/order`, { columnIds });
  }

  public addRow(datasetId: number, values: Record<string, string>): Observable<DatasetRow> {
    return this.http.post<DatasetRow>(`/api/datasets/${datasetId}/rows`, { values });
  }

  public updateRow(
    datasetId: number,
    rowId: string,
    values: Record<string, string>,
  ): Observable<DatasetRow> {
    return this.http.put<DatasetRow>(`/api/datasets/${datasetId}/rows/${rowId}`, { values });
  }

  public removeRow(datasetId: number, rowId: string): Observable<void> {
    return this.http.delete<void>(`/api/datasets/${datasetId}/rows/${rowId}`);
  }
}
