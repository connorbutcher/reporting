import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn, DatasetColumnType } from '../../../../core/models/dataset';
import { FilterGroup } from '../../../../core/models/filter';
import {
  ColumnAlign,
  DataTableColumnSetting,
  DataTableWidgetConfig,
  SortDirection,
} from '../../../../core/models/report';
import { TableCell, TableQueryResult } from '../../../../core/models/widget-query';
import { resolveWidgetFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';

/** Cap on how many rows a non-paginated table pulls in one request. */
const MAX_ROWS = 500;

/** A dataset column paired with the widget's settings for it. */
export interface DisplayColumn {
  column: DatasetColumn;
  header: string;
  align: ColumnAlign;
  sortable: boolean;
  width?: number;
}

@Component({
  selector: 'app-data-table-widget',
  imports: [TableModule],
  templateUrl: './data-table-widget.component.html',
  styleUrl: './data-table-widget.component.scss',
  host: {
    '[class.data-table-widget--no-head]': '!config().showColumnHeaders',
  },
})
export class DataTableWidgetComponent {
  readonly config = input.required<DataTableWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  readonly datasetVersion = input(0);
  /**
   * The report-level filter for this widget's dataset, if any. Combined with the
   * widget's own filter so both the builder and the published viewer narrow rows
   * identically.
   */
  readonly reportFilter = input<FilterGroup | null>(null);
  /**
   * The widget's own filter, supplied by the host rather than read from
   * {@link config} so the builder can leave out conditions the user hasn't
   * finished typing. Defaults to whatever the config carries.
   */
  readonly widgetFilter = input<FilterGroup | null | undefined>(undefined);

  readonly sortChange = output<{ columnId: string; direction: SortDirection }>();
  readonly columnResize = output<{ columnId: string; width: number }[]>();
  readonly columnReorder = output<{ draggedColumnId: string; targetColumnId: string }>();

  private readonly datasetApi = inject(DatasetApiService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  protected readonly datasetId = computed(() => this.config().datasetId);

  /** Report-level and widget-level filters, as the single tree sent to the API. */
  private readonly effectiveFilter = computed(() =>
    resolveWidgetFilter(this.reportFilter(), this.widgetFilter(), this.config().filter),
  );

  /**
   * The table owns its sort/page state once seeded. Feeding the persisted config
   * back in on every save fought the table's own state and left it a click
   * behind, so these are only re-seeded when the dataset reloads.
   */
  protected readonly sortField = signal<string | undefined>(undefined);
  protected readonly sortOrder = signal(1);
  protected readonly first = signal(0);

  private readonly source = new WidgetDataSource<TableQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    // Seed the table's sort/page from the saved config when the dataset (re)loads.
    onSchemaLoad: () => {
      this.sortField.set(this.config().sortColumnId ?? undefined);
      this.sortOrder.set(this.config().sortDirection === 'desc' ? -1 : 1);
      this.first.set(0);
    },
    fetch: () => {
      const datasetId = this.datasetId();
      if (!datasetId) return null;

      const take = this.config().paginator ? this.config().rowsPerPage || 10 : MAX_ROWS;
      return this.datasetApi.queryTable(datasetId, {
        filter: this.effectiveFilter(),
        sortColumnId: this.sortField() ?? null,
        sortDirection: this.sortOrder() === -1 ? 'desc' : 'asc',
        skip: this.first(),
        take,
        columns: this.config().columns,
      });
    },
  });

  protected readonly loading = this.source.loading;
  protected readonly error = this.source.error;
  protected readonly rows = computed(() => this.source.result()?.rows ?? []);

  /** Row counts from the last query, for the paginator and the footer. */
  protected readonly matchedRowCount = computed(() => this.source.result()?.matchedRowCount ?? 0);
  protected readonly totalRowCount = computed(() => this.source.result()?.totalRowCount ?? 0);
  protected readonly isFiltered = computed(() => this.effectiveFilter() !== null);

  /** True when a non-paginated table hit the row cap, so more rows exist than are shown. */
  protected readonly isTruncated = computed(
    () => !this.config().paginator && this.matchedRowCount() > this.rows().length,
  );

  /**
   * The always-on footer text. Makes the row cap visible (rather than silently
   * showing 500 as if it were the whole dataset) and reports the filtered view.
   */
  protected readonly countLabel = computed(() => {
    const matched = this.matchedRowCount();
    if (this.isTruncated()) return `Showing first ${this.rows().length} of ${matched} rows`;
    if (this.isFiltered()) return `Showing ${matched} of ${this.totalRowCount()} rows`;
    return `${matched} row${matched === 1 ? '' : 's'}`;
  });

  /** Row height (px) for the virtual scroller, matched to the table's density. */
  protected readonly rowHeight = computed(() => {
    switch (this.config().density) {
      case 'compact':
        return 31;
      case 'comfortable':
        return 51;
      default:
        return 39;
    }
  });

  /** Columns are chosen explicitly, so the table shows exactly what is configured. */
  protected readonly displayColumns = computed<DisplayColumn[]>(() => {
    const byId = new Map(this.source.columns().map((c) => [c.id, c]));

    return this.config()
      .columns.map((setting) => ({ setting, column: byId.get(setting.columnId) }))
      .filter(
        (pair): pair is { setting: DataTableColumnSetting; column: DatasetColumn } => !!pair.column,
      )
      .map(({ setting, column }) => ({
        column,
        header: setting.header?.trim() || column.name,
        align: setting.align ?? (isNumeric(column.type) ? 'right' : 'left'),
        sortable: setting.sortable !== false,
        width: setting.width,
      }));
  });

  protected readonly resizeKey = computed(() =>
    this.config().resizableColumns ? '-resizable' : '',
  );

  protected readonly density = computed(() => {
    switch (this.config().density) {
      case 'compact':
        return 'small' as const;
      case 'comfortable':
        return 'large' as const;
      default:
        return undefined;
    }
  });

  constructor() {
    // Switching datasets reloads immediately; the filter/column reload below
    // is what gets the typing debounce.
    effect(() => {
      const datasetId = this.datasetId();
      this.datasetVersion();

      if (!datasetId) {
        untracked(() => {
          this.source.result.set(null);
          this.source.loading.set(false);
        });
        return;
      }

      untracked(() => {
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadNow();
      });
    });

    // Rows reload whenever either filter or the widget's own column settings
    // (including tolerance config) change — the server needs both to answer.
    effect(() => {
      if (!this.datasetId()) return;
      this.effectiveFilter();
      this.config().columns;
      this.config().rowsPerPage;
      this.config().paginator;

      untracked(() => {
        this.source.loading.set(true);
        this.source.error.set(false);
        this.first.set(0);
        this.source.reloadDebounced();
      });
    });
  }

  /**
   * PrimeNG's lazy-table event: a sort click, a page change, and — with virtual
   * scroll on — every scroll window. A paged table moves the server window on a
   * page change; a virtual-scrolled table already holds its (capped) window, so
   * only a sort change refetches, never a scroll.
   */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const columnId = typeof event.sortField === 'string' ? event.sortField : undefined;
    const order = event.sortOrder ?? this.sortOrder();
    const sortChanged = columnId !== this.sortField() || order !== this.sortOrder();

    this.sortField.set(columnId);
    this.sortOrder.set(order);

    if (this.config().paginator) {
      this.first.set(event.first ?? 0);
    } else {
      this.first.set(0);
      // A scroll (no sort change) renders from the rows already loaded — don't refetch.
      if (!sortChanged) return;
    }

    // The table also reports the sort we seeded it with, so only persist changes.
    if (columnId) {
      const direction: SortDirection = order === -1 ? 'desc' : 'asc';
      if (columnId !== this.config().sortColumnId || direction !== this.config().sortDirection) {
        this.sortChange.emit({ columnId, direction });
      }
    }

    this.source.loading.set(true);
    this.source.error.set(false);
    this.source.reloadNow();
  }

  /** Retries the last query after a load failure. */
  protected retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  /** A header drag reordered columns; map the moved positions to their column ids for the host to persist. */
  protected onColReorder(event: { dragIndex?: number; dropIndex?: number }): void {
    const cols = this.displayColumns();
    const dragged = event.dragIndex != null ? cols[event.dragIndex]?.column.id : undefined;
    const target = event.dropIndex != null ? cols[event.dropIndex]?.column.id : undefined;
    if (dragged && target && dragged !== target) {
      this.columnReorder.emit({ draggedColumnId: dragged, targetColumnId: target });
    }
  }

  /** Reads the settled header widths once the browser has laid the table out. */
  protected onColResize(): void {
    requestAnimationFrame(() => {
      const headers = this.host.nativeElement.querySelectorAll<HTMLElement>(
        'thead th[data-column-id]',
      );
      const widths = [...headers].map((th) => ({
        columnId: th.dataset['columnId'] as string,
        width: Math.round(th.getBoundingClientRect().width),
      }));
      if (widths.length) this.columnResize.emit(widths);
    });
  }

  /** Red below/above a concession bound, orange in the concession band, else unmarked. */
  protected toleranceClass(cell: TableCell | undefined): string | null {
    switch (cell?.tolerance) {
      case 'fail':
        return 'cell-red';
      case 'concession':
        return 'cell-orange';
      default:
        return null;
    }
  }
}

export function isNumeric(type: DatasetColumnType): boolean {
  return type === 'int' || type === 'double';
}
