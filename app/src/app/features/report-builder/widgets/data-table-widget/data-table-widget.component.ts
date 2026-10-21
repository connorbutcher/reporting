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
import { DatasetColumn } from '../../../../core/models/dataset';
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
import { Csv } from '../csv';
import { FormatRules } from '../format-rules/format-rules';
import { RowDetailDialogComponent } from '../row-detail-dialog/row-detail-dialog.component';
import { RowDetailDialogData } from '../row-detail-dialog/row-detail-dialog-data';
import { EffectiveFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';
import { DataWidgetBase } from '../data-widget-base';
import { WidgetCountBarComponent } from '../widget-count-bar/widget-count-bar.component';
import { WidgetStatusComponent } from '../widget-status/widget-status.component';
import { DisplayColumn } from './display-column';
import { ColumnTypes } from '../../models/column-types';

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
  /** Rows per fetch for a scrolling table, which fills windows in as the reader scrolls. */
  public static readonly SCROLL_WINDOW = 200;

  readonly config = input.required<DataTableWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  readonly datasetVersion = input(0);
  /** The report-level filter for this widget's dataset, layered over its own. */
  readonly reportFilter = input<FilterGroup | null>(null);
  /** The widget's own filter, supplied by the host so half-typed conditions can be dropped. */
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

  private readonly effectiveFilter = computed(() =>
    EffectiveFilter.resolve(this.reportFilter(), this.widgetFilter(), this.config().filter),
  );

  /**
   * The table owns its sort and page once seeded; feeding the saved config back in left it a click
   * behind. Re-seeded only when the dataset reloads.
   */
  protected readonly sortField = signal<string | undefined>(undefined);
  protected readonly sortOrder = signal(1);
  protected readonly first = signal(0);

  protected readonly searchText = signal('');

  private readonly source = new WidgetDataSource<TableQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    onSchemaLoad: () => {
      this.sortField.set(this.config().sortColumnId ?? undefined);
      this.sortOrder.set(this.config().sortDirection === 'desc' ? -1 : 1);
      this.first.set(0);
    },
    fetch: () => {
      const datasetId = this.datasetId();
      if (!datasetId) return null;

      this.windows.set(new Map());
      this.windowGeneration++;
      this.windowsInFlight.clear();

      return this.config().paginator
        ? this.datasetApi.queryTable(
            datasetId,
            this.request(this.first(), this.config().rowsPerPage || 10),
          )
        : this.datasetApi.queryTable(
            datasetId,
            this.request(0, DataTableWidgetComponent.SCROLL_WINDOW),
          );
    },
  });

  /** Rows scrolled in after the first window, by window index. */
  private readonly windows = signal<ReadonlyMap<number, TableRowResult[]>>(new Map());
  /** Bumped when the first window reloads, so stale window responses are dropped. */
  private windowGeneration = 0;
  private readonly windowsInFlight = new Set<number>();

  protected readonly loading = this.source.loading;
  protected readonly error = this.source.error;

  /**
   * A paginated table's page, or one entry per matched row for a scrolling table, undefined where
   * its window hasn't loaded, so the scroller is sized for every row.
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
      windowRows.forEach(
        (row, i) => (rows[index * DataTableWidgetComponent.SCROLL_WINDOW + i] = row),
      );
    }
    return rows;
  });

  protected readonly matchedRowCount = computed(() => this.source.result()?.matchedRowCount ?? 0);
  protected readonly totalRowCount = computed(() => this.source.result()?.totalRowCount ?? 0);
  private readonly searchTerm = computed(() =>
    this.config().showSearch ? this.searchText().trim() : '',
  );
  protected readonly isFiltered = computed(
    () => this.effectiveFilter() !== null || this.searchTerm() !== '',
  );

  protected readonly totals = computed(() => this.source.result()?.totals ?? {});
  private readonly columnStats = computed(() => this.source.result()?.columnStats ?? {});
  protected readonly showTotals = computed(
    () => this.config().showTotals && this.displayColumns().some((c) => c.total),
  );

  protected readonly countLabel = computed(() => {
    const matched = this.matchedRowCount().toLocaleString();
    if (this.isFiltered())
      return `Showing ${matched} of ${this.totalRowCount().toLocaleString()} rows`;
    return `${matched} row${this.matchedRowCount() === 1 ? '' : 's'}`;
  });

  protected readonly rowDetails = computed(() => this.config().rowDetails !== false);

  /** A scrolling table gives rows room for two lines when some column wraps. */
  private readonly wraps = computed(() => this.displayColumns().some((c) => c.wrap));

  public readonly filterLines = computed(() =>
    this.describeFilters([this.effectiveFilter()], this.source.columns()),
  );

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

  /** A scrolling table needs fixed row heights; a paginated one lets wrapped text grow. */
  protected readonly bodyRowHeight = computed(() =>
    this.config().paginator && this.wraps() ? null : this.rowHeight(),
  );

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
        align: setting.align ?? (ColumnTypes.isNumeric(column.type) ? 'right' : 'left'),
        sortable: setting.sortable !== false,
        width: setting.width,
        wrap: !!setting.wrap,
        dataBars: !!setting.dataBars && ColumnTypes.isNumeric(column.type),
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
    // Switching datasets reloads immediately; the reload below debounces typing.
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

    // PrimeNG's virtual scroller measures its viewport once on mount, often while the flex
    // container is still zero-height, and a lazy table won't remeasure when rows land.
    // Re-run its size calc once fresh rows have rendered.
    effect(() => {
      const hasRows = this.rows().length > 0;
      const settled = !this.loading();
      const scroller = this.table()?.scroller();
      if (!hasRows || !settled || !scroller) return;

      untracked(() => {
        requestAnimationFrame(() => scroller.init());
      });
    });
  }

  /**
   * PrimeNG's lazy-table event for sorting, paging and virtual scroll windows. A scrolling table
   * fetches missing windows and reloads whole only on a sort change.
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
        const to = event.last ?? from + (event.rows ?? DataTableWidgetComponent.SCROLL_WINDOW);
        this.loadWindows(from, to);
        return;
      }
    }

    // The table also reports the seeded sort, so only persist changes.
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

  private loadWindows(from: number, to: number): void {
    const datasetId = this.datasetId();
    const result = this.source.result();
    if (!datasetId || !result) return;

    const last = Math.min(to, result.matchedRowCount) - 1;
    for (
      let index = Math.floor(from / DataTableWidgetComponent.SCROLL_WINDOW);
      index <= Math.floor(last / DataTableWidgetComponent.SCROLL_WINDOW);
      index++
    ) {
      if (index === 0 || this.windows().has(index) || this.windowsInFlight.has(index)) continue;

      const generation = this.windowGeneration;
      this.windowsInFlight.add(index);
      this.datasetApi
        .queryTable(
          datasetId,
          this.request(
            index * DataTableWidgetComponent.SCROLL_WINDOW,
            DataTableWidgetComponent.SCROLL_WINDOW,
          ),
        )
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

  protected onSearch(text: string): void {
    this.searchText.set(text);
  }

  /** Its tolerance band, overridden by the first matching format rule. */
  protected cellClass(col: DisplayColumn, cell: TableCell | undefined): string {
    const classes: string[] = [];
    const tolerance = this.toleranceClass(cell);
    if (tolerance) classes.push(tolerance);
    const style = FormatRules.match(cell?.value, col.formatRules);
    if (style) classes.push(FormatRules.STYLE_CLASS[style]);
    if (col.wrap) classes.push(this.config().paginator ? 'wrap' : 'wrap-clamped');
    if (col.dataBars) classes.push('has-bar');
    return classes.join(' ');
  }

  protected barPercent(col: DisplayColumn, cell: TableCell | undefined): number | null {
    if (!col.dataBars) return null;
    const stats = this.columnStats()[col.column.id];
    return FormatRules.dataBarPercent(cell?.value, stats?.min, stats?.max);
  }

  /** Spoken text for a cell's tolerance band, which sighted readers get from colour. */
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

  protected totalCell(col: DisplayColumn, index: number): string {
    const total = this.totals()[col.column.id]?.displayValue;
    if (total) return total;
    return index === 0 && !col.total ? 'Total' : '';
  }

  /** Shows every dataset column, not only those on the table. */
  protected openRow(row: TableRowResult | undefined): void {
    const datasetId = this.datasetId();
    if (!row || !datasetId || !this.rowDetails()) return;

    const own = new Map(this.config().columns.map((c) => [c.columnId, c]));
    const fields = this.source.columns().map((column) => {
      const setting = own.get(column.id) ?? { columnId: column.id };
      return { setting, label: setting.header?.trim() || column.name };
    });
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

  protected retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  protected onColReorder(event: { dragIndex?: number; dropIndex?: number }): void {
    const cols = this.displayColumns();
    const dragged = event.dragIndex != null ? cols[event.dragIndex]?.column.id : undefined;
    const target = event.dropIndex != null ? cols[event.dropIndex]?.column.id : undefined;
    if (dragged && target && dragged !== target) {
      this.columnReorder.emit({ draggedColumnId: dragged, targetColumnId: target });
    }
  }

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

  /** Every matched row, fetched afresh with raw values so spreadsheets get numbers and dates. */
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
    const body = result.rows.map((row) =>
      cols.map((c) => Csv.fromTableCell(row.cells[c.column.id])),
    );
    if (this.config().showTotals && result.totals && cols.some((c) => c.total)) {
      body.push(
        cols.map(
          (c, i) => result.totals![c.column.id]?.value ?? (i === 0 && !c.total ? 'Total' : ''),
        ),
      );
    }
    return Csv.fromRows([header, ...body]);
  }

  protected exportName(): string {
    return this.config().title?.trim() || 'table';
  }
}
