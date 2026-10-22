import { FilterGroup } from '../../../../core/models/filter';
import { DataTableWidgetConfig } from '../../../../core/models/report';

/**
 * The parts of a table query the server reads, so display-only edits (headers, widths, alignment,
 * wrapping, format rules) don't refetch the rows and lose the reader's scroll position.
 */
export class TableQueryKey {
  public static of(
    config: DataTableWidgetConfig,
    filter: FilterGroup | null,
    search: string,
  ): string {
    return JSON.stringify({
      filter,
      search,
      paginator: config.paginator,
      rowsPerPage: config.rowsPerPage,
      columns: config.columns.map((c) => ({
        columnId: c.columnId,
        tolerance: c.tolerance ?? null,
        total: c.total ?? null,
        dataBars: !!c.dataBars,
      })),
    });
  }
}
