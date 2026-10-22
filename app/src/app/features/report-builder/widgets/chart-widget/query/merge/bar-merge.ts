import { FilterGroup } from '../../../../../../core/models/filter';
import { ChartSort } from '../../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult } from '../../../../../../core/models/widget-query';
import { BarChartPart } from '../bar-chart-part';
import { CategoryAxisMerge } from './category-axis-merge';
import { RowCounts } from './row-counts';
import { SeriesLabels } from './series-labels';

export class BarMerge {
  /**
   * Merges each binding's bar response onto one category axis, re-indexing values and filling null
   * for gaps. Repeated legend labels are suffixed.
   */
  public static merge(parts: BarChartPart[], sort?: ChartSort): BarChartQueryResult {
    const first = parts[0].result;
    const { categories, categoryDetails } = CategoryAxisMerge.merge(parts, sort);
    const series = parts.flatMap((part) => BarMerge.series(part, categories, parts.length > 1));
    SeriesLabels.numberRepeatedSeries(series);

    return {
      id: first.id,
      name: first.name,
      categories,
      categoryDetails,
      series,
      // Bands resolve against the primary binding's dataset, matching the panel's schema.
      toleranceBands: first.toleranceBands,
      ...RowCounts.sum(parts),
    };
  }

  private static series(
    { binding, result }: BarChartPart,
    categories: readonly string[],
    multiBinding: boolean,
  ): BarSeriesResult[] {
    const base = binding.label.trim() || result.name;
    const vary = {
      binding: multiBinding,
      measure: new Set(result.series.map((s) => s.valueColumnId ?? '')).size > 1,
      split: result.series.some((s) => s.label !== ''),
    };
    const localIndex = new Map(result.categories.map((c, i) => [c, i]));
    // Drill conditions name this binding's own dataset's columns.
    const categoryDrills = BarMerge.reindex(
      categories,
      localIndex,
      result.categoryDetails?.map((d) => d.drill ?? null),
      null as FilterGroup | null,
    );

    return result.series.map((s): BarSeriesResult => ({
      label: SeriesLabels.compose(base, s.valueColumnLabel, s.label, vary),
      bindingId: binding.id,
      valueColumnId: s.valueColumnId,
      drill: s.drill ?? null,
      values: BarMerge.reindex(categories, localIndex, s.values, null),
      rowCounts: BarMerge.reindex(categories, localIndex, s.rowCounts, null),
      tooltipLines: BarMerge.reindex(categories, localIndex, s.tooltipLines, [] as string[]),
      categoryDrills: [...categoryDrills],
    }));
  }

  /** Re-indexes one binding's values onto the merged axis, filling `missing` for gaps. */
  private static reindex<T>(
    categories: readonly string[],
    localIndex: ReadonlyMap<string, number>,
    values: readonly T[] | undefined,
    missing: T,
  ): T[] {
    return categories.map((category) => {
      const i = localIndex.get(category);
      return i === undefined ? missing : (values?.[i] ?? missing);
    });
  }
}
