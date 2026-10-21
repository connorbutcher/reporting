import { ChartSort } from '../../../../../../core/models/report';
import { ChartCategoryDetail } from '../../../../../../core/models/widget-query';
import { BarChartPart } from '../bar-chart-part';
import { MergedCategories } from './merged-categories';

/** One category axis for every binding's bar response. */
export class CategoryAxisMerge {
  /** With several datasets, the union is re-sorted so a later dataset's categories don't just trail. */
  public static merge(parts: readonly BarChartPart[], sort?: ChartSort): MergedCategories {
    const union: string[] = [];
    const unionDetails: (ChartCategoryDetail | undefined)[] = [];
    const seen = new Set<string>();
    for (const { result } of parts) {
      result.categories.forEach((category, i) => {
        if (seen.has(category)) return;
        seen.add(category);
        union.push(category);
        unionDetails.push(result.categoryDetails?.[i]);
      });
    }
    const order =
      parts.length > 1
        ? CategoryAxisMerge.order(union, unionDetails, sort)
        : union.map((_, i) => i);
    return {
      categories: order.map((i) => union[i]),
      categoryDetails: order.map((i) => unionDetails[i] ?? {}),
    };
  }

  /**
   * A natural sort is re-applied across every dataset (blank, then "Other", last). A column sort's
   * metric exists only on the primary dataset, so its order leads.
   */
  private static order(
    categories: string[],
    details: (ChartCategoryDetail | undefined)[],
    sort: ChartSort | undefined,
  ): number[] {
    const indices = categories.map((_, i) => i);
    if (sort?.by === 'column') return indices;
    const sorted = [...indices].sort((a, b) => {
      const da = details[a];
      const db = details[b];
      const byRank = CategoryAxisMerge.rank(da) - CategoryAxisMerge.rank(db);
      if (byRank !== 0) return byRank;
      if (da?.sortNumber != null && db?.sortNumber != null) return da.sortNumber - db.sortNumber;
      const ta = da?.sortText ?? categories[a];
      const tb = db?.sortText ?? categories[b];
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
    });
    if (!sort?.descending) return sorted;
    // Descending keeps blank and "Other" at the end.
    const real = sorted.filter((i) => CategoryAxisMerge.rank(details[i]) === 0).reverse();
    return [...real, ...sorted.filter((i) => CategoryAxisMerge.rank(details[i]) !== 0)];
  }

  private static rank(detail: ChartCategoryDetail | undefined): number {
    return detail?.isOther ? 2 : detail?.isBlank ? 1 : 0;
  }
}
