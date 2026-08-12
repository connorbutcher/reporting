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
import { DatasetColumn, DatasetColumnType } from '../../../../core/models/dataset.model';
import { FilterGroup } from '../../../../core/models/filter.model';
import {
  ColumnAlign,
  DataTableColumnSetting,
  DataTableWidgetConfig,
  SortDirection,
} from '../../../../core/models/report.model';
import { TableQueryResult } from '../../../../core/models/widget-query.model';
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

  /** Row counts from the last query, for the paginator and the "n of m" footer. */
  protected readonly matchedRowCount = computed(() => this.source.result()?.matchedRowCount ?? 0);
  protected readonly totalRowCount = computed(() => this.source.result()?.totalRowCount ?? 0);
  protected readonly isFiltered = computed(() => this.effectiveFilter() !== null);

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

  /** PrimeNG's lazy-table event: fires for a sort click, a page change, and on first render. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const columnId = typeof event.sortField === 'string' ? event.sortField : undefined;
    const order = event.sortOrder ?? this.sortOrder();

    this.sortField.set(columnId);
    this.sortOrder.set(order);
    this.first.set(event.first ?? 0);

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
  protected toleranceClass(
    cell: TableQueryResult['rows'][number]['cells'][string] | undefined,
  ): string | null {
    switch (cell?.tolerance) {
      case 'fail':
        return 'data-table-widget__cell--red';
      case 'concession':
        return 'data-table-widget__cell--orange';
      default:
        return null;
    }
  }
}

export function isNumeric(type: DatasetColumnType): boolean {
  return type === 'int' || type === 'double';
}
