import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import {
  Component,
  ElementRef,
  Injector,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { firstValueFrom } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn, DatasetColumnType } from '../../../../core/models/dataset';
import { FilterGroup } from '../../../../core/models/filter';
import {
  DataTableColumnSetting,
  DataTableWidgetConfig,
  SortDirection,
} from '../../../../core/models/report';
import {
  TableCell,
  TableQueryRequest,
  TableQueryResult,
  TableRowResult,
} from '../../../../core/models/widget-query';
import { NotificationService } from '../../../../core/services/notification.service';
import { toCsv } from '../csv.util';
import { FORMAT_STYLE_CLASS, dataBarPercent, matchFormatRule } from '../format-rules';
import { RowDetailDialogComponent } from '../row-detail-dialog/row-detail-dialog.component';
import { RowDetailDialogData } from '../row-detail-dialog/row-detail-dialog-data';
import { resolveWidgetFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';
import { DataWidgetBase } from '../data-widget-base';
import { WidgetCountBarComponent } from '../widget-count-bar/widget-count-bar.component';
import { WidgetStatusComponent } from '../widget-status/widget-status.component';
import { DisplayColumn } from './display-column';

/**
 * How many rows a scrolling (non-paginated) table fetches at a time. The table holds a placeholder
 * for every matched row and fills windows in as the reader scrolls to them, so there is no row cap.
 */
export const SCROLL_WINDOW = 200;

@Component({
  selector: 'app-data-table-widget',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    TableModule,
    WidgetCountBarComponent,
    WidgetStatusComponent,
  ],
  templateUrl: './data-table-widget.component.html',
  styleUrl: './data-table-widget.component.scss',
  host: {
    '[class.data-table-widget--no-head]': '!config().showColumnHeaders',
  },
})
export class DataTableWidgetComponent extends DataWidgetBase {
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
  private readonly injector = inject(Injector);
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly table = viewChild(Table);

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

  /** What the reader has typed in the search box. */
  protected readonly searchText = signal('');

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

      // Each new first window starts a fresh set of scrolled-in windows.
      this.windows.set(new Map());
      this.windowGeneration++;
      this.windowsInFlight.clear();

      return this.config().paginator
        ? this.datasetApi.queryTable(
            datasetId,
            this.request(this.first(), this.config().rowsPerPage || 10),
          )
        : this.datasetApi.queryTable(datasetId, this.request(0, SCROLL_WINDOW));
    },
  });

  /** Windows of rows scrolled in after the first, keyed by window index (a scrolling table only). */
  private readonly windows = signal<ReadonlyMap<number, TableRowResult[]>>(new Map());
  /** Bumped whenever the first window reloads, so a window answered for an older query is dropped. */
  private windowGeneration = 0;
  private readonly windowsInFlight = new Set<number>();

  protected readonly loading = this.source.loading;
  protected readonly error = this.source.error;

  /**
   * The rows the table renders. A paginated table holds its page. A scrolling table holds one entry
   * per matched row, filled where a window has loaded and undefined (a placeholder row) elsewhere, so
   * the scroller is sized for every row and fetches the windows the reader scrolls to.
   */
  protected readonly rows = computed<(TableRowResult | undefined)[]>(() => {
    const result = this.source.result();
    if (!result) return [];
    if (this.config().paginator) return result.rows;

    const rows = new Array<TableRowResult | undefined>(
      Math.max(result.matchedRowCount, result.rows.length),
    );
    result.rows.forEach((row, i) => (rows[i] = row));
    for (const [index, windowRows] of this.windows()) {
      windowRows.forEach((row, i) => (rows[index * SCROLL_WINDOW + i] = row));
    }
    return rows;
  });

  /** Row counts from the last query, for the paginator and the footer. */
  protected readonly matchedRowCount = computed(() => this.source.result()?.matchedRowCount ?? 0);
  protected readonly totalRowCount = computed(() => this.source.result()?.totalRowCount ?? 0);
  private readonly searchTerm = computed(() =>
    this.config().showSearch ? this.searchText().trim() : '',
  );
  protected readonly isFiltered = computed(
    () => this.effectiveFilter() !== null || this.searchTerm() !== '',
  );

  /** Each column's total over every matched row, and the range of each data-bar column. */
  protected readonly totals = computed(() => this.source.result()?.totals ?? {});
  private readonly columnStats = computed(() => this.source.result()?.columnStats ?? {});
  protected readonly showTotals = computed(
    () => this.config().showTotals && this.displayColumns().some((c) => c.total),
  );

  /** The always-on footer text: how many rows match, and of how many when something narrows them. */
  protected readonly countLabel = computed(() => {
    const matched = this.matchedRowCount().toLocaleString();
    if (this.isFiltered())
      return `Showing ${matched} of ${this.totalRowCount().toLocaleString()} rows`;
    return `${matched} row${this.matchedRowCount() === 1 ? '' : 's'}`;
  });

  /** Whether clicking a row opens its details. */
  protected readonly rowDetails = computed(() => this.config().rowDetails !== false);

  /** True when some column wraps: a scrolling table then gives each row room for two lines. */
  private readonly wraps = computed(() => this.displayColumns().some((c) => c.wrap));

  /** What is narrowing the rows, for the count bar's hover text. */
  public readonly filterLines = computed(() =>
    this.describeFilters([this.effectiveFilter()], this.source.columns()),
  );

  /** Row height (px) for the virtual scroller, matched to the table's density (and doubled when text wraps). */
  protected readonly rowHeight = computed(() => {
    const extraLine = this.wraps() ? 18 : 0;
    switch (this.config().density) {
      case 'compact':
        return 31 + extraLine;
      case 'comfortable':
        return 51 + extraLine;
      default:
        return 39 + extraLine;
    }
  });

  /**
   * The height each body row is pinned to. A scrolling table needs every row the same height; a
   * paginated one lets wrapped text grow its row.
   */
  protected readonly bodyRowHeight = computed(() =>
    this.config().paginator && this.wraps() ? null : this.rowHeight(),
  );

  /** Columns are chosen explicitly, so the table shows exactly what is configured. */
  protected readonly displayColumns = computed<DisplayColumn[]>(() => {
    const byId = new Map(this.source.columns().map((c) => [c.id, c]));

    const frozen = Math.max(0, this.config().frozenColumns ?? 0);

    return this.config()
      .columns.map((setting) => ({ setting, column: byId.get(setting.columnId) }))
      .filter(
        (pair): pair is { setting: DataTableColumnSetting; column: DatasetColumn } => !!pair.column,
      )
      .map(({ setting, column }, index) => ({
        column,
        header: setting.header?.trim() || column.name,
        align: setting.align ?? (isNumeric(column.type) ? 'right' : 'left'),
        sortable: setting.sortable !== false,
        width: setting.width,
        wrap: !!setting.wrap,
        dataBars: !!setting.dataBars && isNumeric(column.type),
        formatRules: setting.formatRules ?? [],
        total: setting.total ?? null,
        frozen: index < frozen,
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
    super();
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
      this.searchTerm();
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

    // PrimeNG's virtual scroller measures its viewport only when the table first
    // mounts. In this flex layout the container is often still zero-height at
    // that point (and the loading overlay is up), so it computes a render window
    // of zero rows — and because the table is lazy it won't recalculate when the
    // rows land. The data then stays invisible until a scroll or resize nudges
    // the scroller. Re-run its size calc once fresh rows have actually rendered.
    effect(() => {
      const hasRows = this.rows().length > 0;
      const settled = !this.loading();
      const scroller = this.table()?.scroller();
      if (!hasRows || !settled || !scroller) return;

      untracked(() => {
        // A frame later the rows are in the DOM and the flex container has its
        // real height, so the scroller's remeasure sees a non-zero viewport.
        requestAnimationFrame(() => scroller.init());
      });
    });
  }

  /**
   * PrimeNG's lazy-table event: a sort click, a page change, and — with virtual
   * scroll on — every scroll window. A paged table moves the server window on a
   * page change; a scrolling table fetches whichever windows the reader has
   * scrolled to that it doesn't hold yet, and only a sort change reloads it whole.
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
      if (!sortChanged) {
        const from = event.first ?? 0;
        const to = event.last ?? from + (event.rows ?? SCROLL_WINDOW);
        this.loadWindows(from, to);
        return;
      }
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

  /** Fetches each window covering rows [from, to) that isn't loaded or on its way, for a scrolling table. */
  private loadWindows(from: number, to: number): void {
    const datasetId = this.datasetId();
    const result = this.source.result();
    if (!datasetId || !result) return;

    const last = Math.min(to, result.matchedRowCount) - 1;
    for (
      let index = Math.floor(from / SCROLL_WINDOW);
      index <= Math.floor(last / SCROLL_WINDOW);
      index++
    ) {
      // Window 0 is the first query's own rows.
      if (index === 0 || this.windows().has(index) || this.windowsInFlight.has(index)) continue;

      const generation = this.windowGeneration;
      this.windowsInFlight.add(index);
      this.datasetApi
        .queryTable(datasetId, this.request(index * SCROLL_WINDOW, SCROLL_WINDOW))
        .subscribe({
          next: (window) => {
            if (generation !== this.windowGeneration) return;
            this.windowsInFlight.delete(index);
            this.windows.update((windows) => new Map(windows).set(index, window.rows));
          },
          error: () => {
            if (generation === this.windowGeneration) this.windowsInFlight.delete(index);
          },
        });
    }
  }

  /** The query for rows [skip, skip + take) under the table's current filter, search, and sort. */
  private request(skip: number, take: number): TableQueryRequest {
    return {
      filter: this.effectiveFilter(),
      search: this.searchTerm() || null,
      sortColumnId: this.sortField() ?? null,
      sortDirection: this.sortOrder() === -1 ? 'desc' : 'asc',
      skip,
      take,
      columns: this.config().columns,
    };
  }

  /** Applies what the reader typed in the search box, once they pause. */
  protected onSearch(text: string): void {
    this.searchText.set(text);
  }

  /** The cell's highlight: its tolerance band, overridden by the first conditional-format rule it matches. */
  protected cellClass(col: DisplayColumn, cell: TableCell | undefined): string {
    const classes: string[] = [];
    const tolerance = this.toleranceClass(cell);
    if (tolerance) classes.push(tolerance);
    const style = matchFormatRule(cell?.value, col.formatRules);
    if (style) classes.push(FORMAT_STYLE_CLASS[style]);
    if (col.wrap) classes.push(this.config().paginator ? 'wrap' : 'wrap-clamped');
    if (col.dataBars) classes.push('has-bar');
    return classes.join(' ');
  }

  /** How long a cell's data bar is, as a percentage of its column's range; null for no bar. */
  protected barPercent(col: DisplayColumn, cell: TableCell | undefined): number | null {
    if (!col.dataBars) return null;
    const stats = this.columnStats()[col.column.id];
    return dataBarPercent(cell?.value, stats?.min, stats?.max);
  }

  /** The words a screen reader hears for a cell's tolerance band, which sighted readers get from its colour. */
  protected toleranceText(cell: TableCell | undefined): string | null {
    switch (cell?.tolerance) {
      case 'fail':
        return 'Out of tolerance';
      case 'concession':
        return 'Needs concession';
      default:
        return null;
    }
  }

  /** The totals row's cell for a column: its total, or "Total" in a leading column that has none. */
  protected totalCell(col: DisplayColumn, index: number): string {
    const total = this.totals()[col.column.id]?.displayValue;
    if (total) return total;
    return index === 0 && !col.total ? 'Total' : '';
  }

  /** Opens the clicked row's details: every dataset column, not only those on the table. */
  protected openRow(row: TableRowResult | undefined): void {
    const datasetId = this.datasetId();
    if (!row || !datasetId || !this.rowDetails()) return;

    const own = new Map(this.config().columns.map((c) => [c.columnId, c]));
    const fields = this.source.columns().map((column) => {
      const setting = own.get(column.id) ?? { columnId: column.id };
      return { setting, label: setting.header?.trim() || column.name };
    });
    // The table's own columns lead, in its order, then the rest of the dataset's.
    const order = new Map(this.config().columns.map((c, i) => [c.columnId, i]));
    fields.sort(
      (a, b) => (order.get(a.setting.columnId) ?? 1e6) - (order.get(b.setting.columnId) ?? 1e6),
    );

    this.dialog.open<void, RowDetailDialogData>(RowDetailDialogComponent, {
      data: {
        datasetId,
        rowId: row.id,
        title: this.config().title?.trim() || 'Row details',
        fields,
      },
      positionStrategy: this.overlay.position().global().right('0').top('0'),
      height: '100vh',
      ariaLabelledBy: 'row-detail-title',
    });
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

  /**
   * The table as CSV: a header row, then every matched row (not only the page or scroll window on
   * screen), fetched afresh under the current filter, search, and sort. Values are the raw ones, so
   * numbers and dates land in a spreadsheet as numbers and dates rather than formatted text.
   */
  protected async exportCsv(): Promise<string | null> {
    const datasetId = this.datasetId();
    const cols = this.displayColumns();
    if (!datasetId || cols.length === 0) return null;

    const result = await firstValueFrom(this.datasetApi.exportTable(datasetId, this.request(0, 0)));
    if (result.rows.length < result.matchedRowCount) {
      this.injector
        .get(NotificationService)
        .warn(
          `Exported the first ${result.rows.length.toLocaleString()} of ${result.matchedRowCount.toLocaleString()} rows.`,
          'Export limited',
        );
    }

    const header = cols.map((c) => c.header);
    const body = result.rows.map((row) => cols.map((c) => csvValue(row.cells[c.column.id])));
    if (this.config().showTotals && result.totals && cols.some((c) => c.total)) {
      body.push(
        cols.map(
          (c, i) => result.totals![c.column.id]?.value ?? (i === 0 && !c.total ? 'Total' : ''),
        ),
      );
    }
    return toCsv([header, ...body]);
  }

  protected exportName(): string {
    return this.config().title?.trim() || 'table';
  }
}

export function isNumeric(type: DatasetColumnType): boolean {
  return type === 'int' || type === 'double';
}

/**
 * A cell's value for a CSV: numbers as plain numbers, dates as `yyyy-MM-dd HH:mm:ss` (or just the day
 * at midnight), which spreadsheets read as dates, and anything else as its displayed text.
 */
export function csvValue(cell: TableCell | undefined): unknown {
  const value = cell?.value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const [day, time] = value.slice(0, 19).split('T');
    return time === '00:00:00' ? day : `${day} ${time}`;
  }
  return cell?.displayValue ?? '';
}
