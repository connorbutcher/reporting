import { Observable } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter.model';
import { ChartWidgetConfig } from '../../../../core/models/report.model';
import { BarChartQueryResult, ChartQueryResult } from '../../../../core/models/widget-query.model';

/**
 * Builds the query for a chart's current config, or returns null when there
 * isn't enough bound to ask (no dataset, missing axes). A bar chart groups and
 * aggregates server-side, so it hits a different endpoint and needs a category
 * (and, unless counting, a measure); the point charts send raw axes.
 */
export function buildChartQuery(
  api: DatasetApiService,
  datasetId: number | null,
  config: ChartWidgetConfig,
  filter: FilterGroup | null,
): Observable<ChartQueryResult | BarChartQueryResult> | null {
  if (!datasetId) return null;

  if (config.type === 'barChart') {
    const category = config.xColumnId;
    if (!category) return null;
    const needsValue = config.aggregate !== 'count';
    if (needsValue && !config.yColumnId) return null;

    return api.queryBarChart(datasetId, {
      filter,
      categoryColumnId: category,
      valueColumnId: needsValue ? config.yColumnId : null,
      aggregate: config.aggregate,
      seriesColumnId: config.seriesColumnId,
      toleranceBands: config.toleranceBands,
    });
  }

  const x = config.xColumnId;
  const y = config.yColumnId;
  if (!x || !y) return null;

  return api.queryChart(datasetId, {
    filter,
    xColumnId: x,
    yColumnId: y,
    seriesColumnId: config.seriesColumnId,
    toleranceBands: config.toleranceBands,
    tooltipColumns: config.tooltipColumns,
  });
}
