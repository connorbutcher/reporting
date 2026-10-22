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

  /** The fixed set of source systems a dataset can draw from. */
  public listSources(): Observable<DatasetSource[]> {
    return this.http.get<DatasetSource[]>('/api/dataset-sources');
  }

  /** The datasets owned by a report's checked-out draft revision. */
  public listForReport(reportId: number): Observable<DatasetSummary[]> {
    return this.http.get<DatasetSummary[]>(`/api/reports/${reportId}/datasets`);
  }

  public getSchema(id: number): Observable<DatasetSchema> {
    return this.http.get<DatasetSchema>(`/api/datasets/${id}/schema`);
  }

  public getData(id: number): Observable<DatasetData> {
    return this.http.get<DatasetData>(`/api/datasets/${id}/data`);
  }

  /**
   * A window of a dataset's rows for the editor grid's lazy virtual scroll:
   * `count` rows from `first`, plus the total row count. Keeps a large dataset
   * from loading into the editor all at once.
   */
  public getRowWindow(id: number, first: number, count: number): Observable<DatasetRowWindow> {
    return this.http.get<DatasetRowWindow>(
      `/api/datasets/${id}/rows?first=${first}&count=${count}`,
    );
  }

  /**
   * Rows matching a filter. Filtering runs in SQL, so a widget never pulls rows
   * it isn't going to show.
   */
  public query(id: number, filter: FilterGroup | null): Observable<DatasetQueryResult> {
    return this.http.post<DatasetQueryResult>(`/api/datasets/${id}/query`, { filter });
  }

  /**
   * How many rows match a filter, out of the dataset's total — the counts only, without
   * the rows. Counted in SQL, so the filter panel's live "matches N of M" readout can run
   * on each edit without pulling whole datasets.
   */
  public countMatches(id: number, filter: FilterGroup | null): Observable<DatasetCountResult> {
    return this.http.post<DatasetCountResult>(`/api/datasets/${id}/count`, { filter });
  }

  /**
   * A page of rows shaped for a table widget: filtered, sorted, and paged
   * server-side, with each cell already formatted and tolerance-classified.
   */
  public queryTable(id: number, request: TableQueryRequest): Observable<TableQueryResult> {
    return this.http.post<TableQueryResult>(`/api/datasets/${id}/table-query`, request);
  }

  /** Every matched row for a table widget (up to the server's export cap), for a CSV of the whole table. */
  public exportTable(id: number, request: TableQueryRequest): Observable<TableQueryResult> {
    return this.http.post<TableQueryResult>(`/api/datasets/${id}/table-export`, request);
  }

  /**
   * Rows shaped for a chart widget: filtered, grouped into series, and paired
   * with resolved tolerance bounds and pre-formatted tooltip lines.
   */
  public queryChart(id: number, request: ChartQueryRequest): Observable<ChartQueryResult> {
    return this.http.post<ChartQueryResult>(`/api/datasets/${id}/chart-query`, request);
  }

  /**
   * Rows shaped for a bar chart: filtered, grouped by the category column, and
   * reduced to one value per category (per series) by the chosen aggregate.
   */
  public queryBarChart(id: number, request: BarChartQueryRequest): Observable<BarChartQueryResult> {
    return this.http.post<BarChartQueryResult>(`/api/datasets/${id}/bar-chart-query`, request);
  }

  /**
   * Rows shaped for a box-and-whisker chart: filtered, grouped by the category column, and
   * each group's measure values reduced to a five-number summary with outliers.
   */
  public queryBoxPlot(id: number, request: BoxPlotQueryRequest): Observable<BoxPlotQueryResult> {
    return this.http.post<BoxPlotQueryResult>(`/api/datasets/${id}/box-plot-query`, request);
  }

  /**
   * Rows shaped for an Xbar-R control chart: filtered, grouped by the subgroup column, and each
   * subgroup's measure values reduced to a mean and a range against control limits derived from
   * the data.
   */
  public queryXBarRChart(
    id: number,
    request: XBarRChartQueryRequest,
  ): Observable<XBarRChartQueryResult> {
    return this.http.post<XBarRChartQueryResult>(`/api/datasets/${id}/xbar-r-chart-query`, request);
  }

  /**
   * Values shaped for a histogram: filtered, then the chosen numeric column's values binned into
   * equal ranges with each bin's frequency returned as a bar height.
   */
  public queryHistogram(
    id: number,
    request: HistogramQueryRequest,
  ): Observable<HistogramQueryResult> {
    return this.http.post<HistogramQueryResult>(`/api/datasets/${id}/histogram-query`, request);
  }

  /**
   * Rows shaped for a pivot / aggregation table: filtered, grouped by the row-dimension columns,
   * and each group reduced to one value per measure by that measure's aggregate.
   */
  public queryPivot(id: number, request: PivotQueryRequest): Observable<PivotQueryResult> {
    return this.http.post<PivotQueryResult>(`/api/datasets/${id}/pivot-query`, request);
  }

  /**
   * A single headline number reduced from the dataset: a plain aggregate, or the count/percent of
   * rows failing a tolerance band, optionally compared against a fixed target or the previous period.
   */
  public queryKpi(id: number, request: KpiQueryRequest): Observable<KpiQueryResult> {
    return this.http.post<KpiQueryResult>(`/api/datasets/${id}/kpi-query`, request);
  }

  /**
   * The distinct values a column holds, for the filter panel's value dropdowns — so a column
   * like "shift" offers its real day/night values rather than free text. Ordered and capped;
   * `search` narrows to matching values for type-ahead on higher-cardinality columns.
   */
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

  // --- dataset management ---------------------------------------------------

  /** Creates a dataset on a report's draft revision, drawing from the given source. */
  public create(reportId: number, name: string, sourceId: number): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>(`/api/reports/${reportId}/datasets`, { name, sourceId });
  }

  public rename(id: number, name: string): Observable<DatasetSummary> {
    return this.http.put<DatasetSummary>(`/api/datasets/${id}`, { name });
  }

  /** Deep-copies a dataset (columns, rows and data) within its report's draft, under a new name. */
  public clone(id: number, name: string): Observable<DatasetSummary> {
    return this.http.post<DatasetSummary>(`/api/datasets/${id}/clone`, { name });
  }

  /** Repoints a dataset at a different source; its config resets to that source's default. */
  public setSource(id: number, sourceId: number): Observable<DatasetSchema> {
    return this.http.put<DatasetSchema>(`/api/datasets/${id}/source`, { sourceId });
  }

  /** Replaces a dataset's source configuration; the config's source must match the dataset's. */
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

  /**
   * What changing a column to `type` would newly break in the report — advisory, so a failure is left
   * to the caller to describe rather than raised as a toast.
   */
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
