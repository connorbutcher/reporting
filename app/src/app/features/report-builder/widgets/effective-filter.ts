import { FilterGroup, FilterTrees } from '../../../core/models/filter';

export class EffectiveFilter {
  /**
   * The widget's own filter under the report-level filter. An undefined `widgetFilter` falls back
   * to the saved `configFilter`; a supplied one (even null) wins, so half-typed conditions can be
   * dropped.
   */
  public static resolve(
    reportFilter: FilterGroup | null,
    widgetFilter: FilterGroup | null | undefined,
    configFilter: FilterGroup | null,
  ): FilterGroup | null {
    return FilterTrees.combine(
      reportFilter,
      widgetFilter === undefined ? configFilter : widgetFilter,
    );
  }
}
