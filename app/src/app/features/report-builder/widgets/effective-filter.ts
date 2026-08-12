import { FilterGroup, combineFilters } from '../../../core/models/filter.model';

/**
 * The single filter tree a widget sends to the server: its own filter layered
 * under the report-level filter for its dataset. Shared by the table and chart
 * widgets so both the builder and the published viewer narrow rows identically.
 *
 * `widgetFilter` is `undefined` when the host isn't overriding — in that case the
 * widget's saved config filter is used; when the host supplies one (possibly
 * `null`), it wins, so the builder can drop conditions the user is still typing.
 */
export function resolveWidgetFilter(
  reportFilter: FilterGroup | null,
  widgetFilter: FilterGroup | null | undefined,
  configFilter: FilterGroup | null,
): FilterGroup | null {
  const own = widgetFilter === undefined ? configFilter : widgetFilter;
  return combineFilters(reportFilter, own);
}
