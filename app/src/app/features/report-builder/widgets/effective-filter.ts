import { FilterGroup, combineFilters } from '../../../core/models/filter';

/** Builds the filter a widget sends to the server. */
export class EffectiveFilter {
  /**
   * The one filter tree a widget sends to the server: its own filter under the report-level filter.
   * Shared by table and chart widgets so the builder and the viewer narrow rows identically.
   *
   * An undefined `widgetFilter` means the host isn't overriding, so the saved `configFilter` is used;
   * a supplied one (even null) wins, so the builder can drop conditions still being typed.
   */
  public static resolve(
    reportFilter: FilterGroup | null,
    widgetFilter: FilterGroup | null | undefined,
    configFilter: FilterGroup | null,
  ): FilterGroup | null {
    return combineFilters(reportFilter, widgetFilter === undefined ? configFilter : widgetFilter);
  }
}
