import {
  LOCALE_ID,
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
import { formatDate } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SortEvent } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn, DatasetColumnType, DatasetData } from '../../../../core/models/dataset.model';
import { FilterGroup, combineFilters } from '../../../../core/models/filter.model';
import {
  ColumnAlign,
  DataTableColumnSetting,
  DataTableWidgetConfig,
  SortDirection,
} from '../../../../core/models/report.model';

const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';
/** Long enough that typing a filter value settles into one request. */
const QUERY_DEBOUNCE_MS = 300;

/** A row flattened to `columnId -> typed value`, so table sorting compares like with like. */
type TableRow = Record<string, unknown>;

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
  private readonly locale = inject(LOCALE_ID);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  private readonly allColumns = signal<DatasetColumn[]>([]);
  private readonly data = signal<DatasetData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  /** Row counts from the last query, for the "n of m" footer when filtering. */
  protected readonly matchedRowCount = signal(0);
  protected readonly totalRowCount = signal(0);
  protected readonly isFiltered = computed(() => this.effectiveFilter() !== null);

  protected readonly datasetId = computed(() => this.config().datasetId);

  /** Report-level and widget-level filters, as the single tree sent to the API. */
  private readonly effectiveFilter = computed(() => {
    const own = this.widgetFilter() === undefined ? this.config().filter : this.widgetFilter()!;
    return combineFilters(this.reportFilter(), own);
  });

  /** Columns are chosen explicitly, so the table shows exactly what is configured. */
  protected readonly displayColumns = computed<DisplayColumn[]>(() => {
    const byId = new Map(this.allColumns().map((c) => [c.id, c]));

    const chosen = this.config()
      .columns.map((setting) => ({ setting, column: byId.get(setting.columnId) }))
      .filter((pair): pair is { setting: DataTableColumnSetting; column: DatasetColumn } => !!pair.column);

    return chosen.map(({ setting, column }) => ({
      column,
      header: setting.header?.trim() || column.name,
      align: setting.align ?? (isNumeric(column.type) ? 'right' : 'left'),
      sortable: setting.sortable !== false,
      width: setting.width,
    }));
  });

  protected readonly tableRows = computed<TableRow[]>(() => {
    const columns = this.allColumns();
    return (this.data()?.rows ?? []).map((row) => {
      const flat: TableRow = { __rowId: row.id };
      for (const column of columns) {
        flat[column.id] = coerce(row.values[column.id], column.type);
      }
      return flat;
    });
  });

  protected readonly resizeKey = computed(() => (this.config().resizableColumns ? '-resizable' : ''));

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

  /**
   * The table owns its sort state once seeded. Feeding the persisted config
   * back in on every save fought the table's own state and left it a click
   * behind, so these are only re-seeded when the dataset reloads.
   */
  protected readonly sortField = signal<string | undefined>(undefined);
  protected readonly sortOrder = signal(1);

  /** Coalesces reloads so typing a filter value doesn't fire a request per keystroke. */
  private readonly queryQueue = new Subject<void>();

  constructor() {
    // The schema describes the table and changes only with the dataset, so it
    // loads immediately rather than through the debounced row pipeline.
    effect((onCleanup) => {
      const datasetId = this.datasetId();
      this.datasetVersion();

      if (!datasetId) {
        this.allColumns.set([]);
        return;
      }

      // Seed the table's sort from the saved config, untracked so persisting a
      // sort doesn't refetch the dataset or stomp the table mid-interaction.
      untracked(() => {
        this.sortField.set(this.config().sortColumnId ?? undefined);
        this.sortOrder.set(this.config().sortDirection === 'desc' ? -1 : 1);
      });

      const subscription = this.datasetApi
        .getSchema(datasetId)
        .subscribe({ next: (schema) => this.allColumns.set(schema.columns), error: () => this.error.set(true) });

      onCleanup(() => subscription.unsubscribe());
    });

    // Rows reload whenever the dataset, its configuration, or either filter changes.
    effect(() => {
      const datasetId = this.datasetId();
      this.datasetVersion();
      this.effectiveFilter();

      if (!datasetId) {
        untracked(() => {
          this.data.set(null);
          this.loading.set(false);
        });
        return;
      }

      untracked(() => {
        this.loading.set(true);
        this.error.set(false);
        this.queryQueue.next();
      });
    });

    this.queryQueue
      .pipe(
        debounceTime(QUERY_DEBOUNCE_MS),
        switchMap(() => {
          const datasetId = this.datasetId();
          if (!datasetId) return EMPTY;

          return this.datasetApi.query(datasetId, this.effectiveFilter()).pipe(
            // Caught inside the switchMap: an error reaching the outer stream
            // would tear down the subscription and stop all future reloads.
            catchError(() => {
              this.error.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.data.set({ id: result.id, name: result.name, rows: result.rows });
        this.matchedRowCount.set(result.matchedRowCount);
        this.totalRowCount.set(result.totalRowCount);
        this.loading.set(false);
      });
  }

  protected onSort(event: SortEvent): void {
    const columnId = event.field;
    if (!columnId) return;

    const direction: SortDirection = event.order === -1 ? 'desc' : 'asc';
    this.sortField.set(columnId);
    this.sortOrder.set(event.order === -1 ? -1 : 1);

    // The table also reports the sort we seeded it with, so only persist changes.
    if (columnId === this.config().sortColumnId && direction === this.config().sortDirection) return;
    this.sortChange.emit({ columnId, direction });
  }

  /** Reads the settled header widths once the browser has laid the table out. */
  protected onColResize(): void {
    requestAnimationFrame(() => {
      const headers = this.host.nativeElement.querySelectorAll<HTMLElement>('thead th[data-column-id]');
      const widths = [...headers].map((th) => ({
        columnId: th.dataset['columnId'] as string,
        width: Math.round(th.getBoundingClientRect().width),
      }));
      if (widths.length) this.columnResize.emit(widths);
    });
  }

  /** Rendering is driven by the column's stored configuration blob. */
  protected format(value: unknown, column: DatasetColumn): string {
    if (value === null || value === undefined || value === '') return '';
    const config = column.configuration ?? {};

    switch (column.type) {
      case 'int':
      case 'double': {
        const options: Intl.NumberFormatOptions = { useGrouping: config.useGrouping !== false };
        if (typeof config.decimals === 'number' && config.decimals >= 0) {
          options.minimumFractionDigits = config.decimals;
          options.maximumFractionDigits = config.decimals;
        }
        const formatted = new Intl.NumberFormat(this.locale, options).format(value as number);
        return `${config.prefix ?? ''}${formatted}${config.suffix ?? ''}`;
      }
      case 'dateTime': {
        if (!(value instanceof Date)) return String(value);
        try {
          return formatDate(value, config.dateFormat || DEFAULT_DATE_FORMAT, this.locale);
        } catch {
          // A bad pattern shouldn't blank the cell.
          return formatDate(value, DEFAULT_DATE_FORMAT, this.locale);
        }
      }
      case 'bool':
        return value ? (config.trueLabel ?? 'Yes') : (config.falseLabel ?? 'No');
      default:
        return String(value);
    }
  }
}

export function isNumeric(type: DatasetColumnType): boolean {
  return type === 'int' || type === 'double';
}

/** Values arrive as strings; sorting needs the column's real type. */
function coerce(raw: string | undefined, type: DatasetColumnType): unknown {
  if (raw === undefined || raw === null || raw === '') return null;

  switch (type) {
    case 'int':
    case 'double': {
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? null : parsed;
    }
    case 'bool':
      return raw.toLowerCase() === 'true';
    case 'dateTime': {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    default:
      return raw;
  }
}
