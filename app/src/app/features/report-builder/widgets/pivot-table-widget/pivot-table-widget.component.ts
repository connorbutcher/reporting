import { Dialog } from '@angular/cdk/dialog';
import {
  Component,
  Signal,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup, combineFilters } from '../../../../core/models/filter';
import { FormatRule, PivotTableWidgetConfig } from '../../../../core/models/report';
import { PivotQueryResult, PivotRow } from '../../../../core/models/widget-query';
import { toCsv } from '../csv.util';
import { resolveWidgetFilter } from '../effective-filter';
import { FORMAT_STYLE_CLASS, dataBarPercent, matchFormatRule } from '../format-rules';
import { WidgetDataSource } from '../widget-data-source';
import { DataWidgetBase } from '../data-widget-base';
import { WidgetCountBarComponent } from '../widget-count-bar/widget-count-bar.component';
import { WidgetStatusComponent } from '../widget-status/widget-status.component';
import { DrillThroughDialogComponent } from '../drill-through-dialog/drill-through-dialog.component';
import { DrillThroughDialogData } from '../drill-through-dialog/drill-through-dialog-data';
import { PivotDimensionColumn } from './models/pivot-dimension-column';
import { PivotValueColumn } from './models/pivot-value-column';
import { PivotColumnBlock } from './models/pivot-column-block';
import { PivotSort } from './models/pivot-sort';
import { PivotDisplayRow } from './models/pivot-display-row';

@Component({
  selector: 'app-pivot-table-widget',
  imports: [NgTemplateOutlet, TableModule, WidgetCountBarComponent, WidgetStatusComponent],
  templateUrl: './pivot-table-widget.component.html',
  styleUrl: './pivot-table-widget.component.scss',
})
export class PivotTableWidgetComponent extends DataWidgetBase {
  public readonly config = input.required<PivotTableWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  public readonly datasetVersion = input(0);
  /** The report-level filter for this widget's dataset, layered over its own. */
  public readonly reportFilter = input<FilterGroup | null>(null);
  /** The widget's own filter, supplied by the host so half-typed conditions can be dropped. */
  public readonly widgetFilter = input<FilterGroup | null | undefined>(undefined);

  public readonly datasetId = computed(() => this.config().datasetId);
  /** True once a dataset is bound and at least one measure is configured. */
  public readonly configured = computed(
    () => !!this.config().datasetId && this.config().measures.length > 0,
  );

  /** The dimension columns, one per row field. */
  public readonly dimensionColumns = computed<PivotDimensionColumn[]>(
    () =>
      this.source.result()?.rowFields.map((f, fieldIndex) => ({ label: f.label, fieldIndex })) ??
      [],
  );

  /** True when column fields spread the measures across the top, so the header takes two rows. */
  public readonly crossTab = computed(() => (this.source.result()?.columnFields?.length ?? 0) > 0);

  /** The headings over each block of value columns (only drawn for a cross-tab). */
  public readonly columnBlocks = computed<PivotColumnBlock[]>(() => {
    const data = this.source.result();
    if (!data || !this.crossTab()) return [];
    const span = data.measures.length;
    const blocks = (data.columnKeys ?? []).map((k) => ({ label: k.labels.join(' · '), span }));
    if (data.hasRowTotals) blocks.push({ label: 'Total', span });
    return blocks;
  });

  /** Every value column in render order: each block's measures, block by block. */
  public readonly valueColumns = computed<PivotValueColumn[]>(() => {
    const data = this.source.result();
    if (!data) return [];
    // The key is "m<request position>" — the server drops unusable measures but keeps the numbering.
    const measures = data.measures.map((m) => ({
      label: m.label,
      measureIndex: Number(m.key.slice(1)),
    }));
    const keyBlocks: (number | null)[] = this.crossTab()
      ? (data.columnKeys ?? []).map((_, i) => i)
      : [];
    if (!this.crossTab() || data.hasRowTotals) keyBlocks.push(null);

    return keyBlocks.flatMap((columnKeyIndex, block) =>
      measures.map((m, i) => ({ ...m, columnKeyIndex, valueIndex: block * measures.length + i })),
    );
  });

  /**
   * The sort the table is showing: the reader's own choice from clicking a header (null = they
   * turned sorting off), else the report's saved one. Clicking is a view choice for this session —
   * it never edits the report — and is dropped whenever the widget's configuration changes.
   */
  public readonly effectiveSort = computed<PivotSort | null>(() => {
    const override = this.viewSort();
    if (override !== undefined) return override;
    const config = this.config();
    const index = config.sortMeasureId
      ? config.measures.findIndex((m) => m.id === config.sortMeasureId)
      : -1;
    return index >= 0 ? { kind: 'measure', index, descending: config.sortDescending } : null;
  });

  /** The rows shown: everything, less the children of any subtotal the reader has collapsed. */
  public readonly rows = computed<PivotDisplayRow[]>(() => {
    const collapsed = this.collapsed();
    if (collapsed.size === 0) return this.allRows();

    let hiddenUnder: string | null = null;
    return this.allRows().filter((row) => {
      if (hiddenUnder !== null) {
        if (row.groupKey.startsWith(hiddenUnder + '\u0001')) return false;
        hiddenUnder = null;
      }
      if (row.isSubtotal && collapsed.has(row.groupKey)) hiddenUnder = row.groupKey;
      return true;
    });
  });

  /** The totals row when the server returned one, else null. */
  public readonly grandTotal = computed<PivotDisplayRow | null>(() => {
    const total = this.source.result()?.grandTotal;
    if (!total) return null;
    return {
      dimensions: total.dimensions,
      path: [],
      values: total.values,
      isSubtotal: false,
      depth: 0,
      groupKey: '',
      drill: total.drill ?? null,
    };
  });

  public readonly isTruncated = computed(() => !!this.source.result()?.truncated);

  /** What is narrowing the rows, for the count bar's hover text. */
  public readonly filterLines = computed(() =>
    this.describeFilters([this.effectiveFilter()], this.source.columns()),
  );

  /**
   * The always-on footer text, mirroring the data table's "N of M rows" — and, above all, saying
   * plainly when the figures are incomplete because only part of the data was summarised.
   */
  public readonly countLabel = computed(() => {
    const data = this.source.result();
    if (!data) return '';
    const matched = data.matchedRowCount;
    if (data.scanTruncated) {
      const scanned = (data.scannedRowCount ?? 0).toLocaleString();
      return `Totals are incomplete: only the first ${scanned} of ${matched.toLocaleString()} rows were summarised`;
    }

    const groups = data.rows.filter((r) => !r.isSubtotal).length;
    const total = data.totalRowCount;
    const groupsText = data.rowsTruncated
      ? `Showing the first ${groups.toLocaleString()} groups`
      : `${groups.toLocaleString()} group${groups === 1 ? '' : 's'}`;
    const rowsText =
      matched !== total
        ? `${matched.toLocaleString()} of ${total.toLocaleString()} rows`
        : `${matched.toLocaleString()} row${matched === 1 ? '' : 's'}`;
    const columnsText = data.columnsTruncated
      ? ` · first ${data.columnKeys?.length ?? 0} columns`
      : '';
    return `${groupsText} · ${rowsText}${columnsText}`;
  });

  /** Subtotal groups the reader has folded away, by outline key. */
  private readonly collapsed = signal<ReadonlySet<string>>(new Set());

  /** Every row from the server, flattened, with repeated outer dimensions blanked into an outline. */
  private readonly allRows = computed<PivotDisplayRow[]>(() => {
    const data = this.source.result();
    if (!data) return [];

    const dimCount = data.rowFields.length;
    let previous: string[] | null = null;

    return data.rows.map((row) => {
      const depth = row.depth ?? dimCount;
      const dimensions = [...row.dimensions];
      if (previous) {
        // Blank leading dimension cells while the whole prefix still matches the row above.
        for (let i = 0; i < Math.min(depth, dimCount); i++) {
          if (row.dimensions[i] === previous[i]) dimensions[i] = '';
          else break;
        }
      }
      previous = row.dimensions;
      return {
        dimensions,
        path: row.dimensions.slice(0, depth),
        values: row.values,
        isSubtotal: !!row.isSubtotal,
        depth,
        groupKey: row.dimensions.slice(0, depth).join('\u0001'),
        drill: row.drill ?? null,
      };
    });
  });

  /** Each value column's range over the detail rows, for scaling its data bars. */
  private readonly valueRanges = computed(() => {
    const ranges = new Map<number, { min: number; max: number }>();
    for (const column of this.valueColumns()) {
      if (!this.measureConfig(column.measureIndex)?.dataBars) continue;
      const values = this.allRows()
        .filter((r) => !r.isSubtotal)
        .map((r) => r.values[column.valueIndex]?.value)
        .filter((v): v is number => typeof v === 'number');
      if (values.length)
        ranges.set(column.valueIndex, { min: Math.min(...values), max: Math.max(...values) });
    }
    return ranges;
  });

  private readonly datasetApi = inject(DatasetApiService);
  private readonly dialog = inject(Dialog);

  /** The reader's header-click sort: undefined follows the report's saved sort, null is "unsorted". */
  private readonly viewSort = signal<PivotSort | null | undefined>(undefined);

  private readonly effectiveFilter = computed(() =>
    resolveWidgetFilter(this.reportFilter(), this.widgetFilter(), this.config().filter),
  );

  private readonly source = new WidgetDataSource<PivotQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () => {
      const config = this.config();
      const datasetId = config.datasetId;
      const measures = config.measures;
      if (!datasetId || measures.length === 0) return null;

      // The request names the sort measure (or field) by its position.
      const sort = this.effectiveSort();

      return this.datasetApi.queryPivot(datasetId, {
        filter: this.effectiveFilter(),
        rowFields: config.rowFields,
        columnFields: config.columnFields ?? [],
        fieldGroupings: config.fieldGroupings ?? [],
        measures: measures.map((m) => ({
          columnId: m.columnId,
          aggregate: m.aggregate,
          showAs: m.showAs ?? 'value',
          label: m.label,
        })),
        sortMeasureIndex: sort?.kind === 'measure' ? sort.index : null,
        sortRowFieldIndex: sort?.kind === 'field' ? sort.index : null,
        sortDescending: sort?.descending ?? false,
        showGrandTotal: config.showGrandTotal,
        showSubtotals: !!config.showSubtotals,
      });
    },
  });

  constructor() {
    super();
    // Switching datasets reloads immediately; the config-driven reload below debounces.
    effect(() => {
      const ready = this.configured();
      this.datasetVersion();

      // With no dataset or no measures there's nothing to ask for, so clear rather than
      // leaving the spinner up — `fetch` would return null and never resolve the load.
      if (!ready) {
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

    // Re-aggregate whenever the grouping, measures, totals toggles, or filter change.
    effect(() => {
      if (!this.configured()) return;
      this.effectiveFilter();
      const config = this.config();
      config.rowFields;
      config.columnFields;
      config.fieldGroupings;
      config.measures;
      config.sortMeasureId;
      config.sortDescending;
      config.showGrandTotal;
      config.showSubtotals;

      untracked(() => {
        // A configuration change resets the view to the report's own sort and expands every group.
        this.viewSort.set(undefined);
        this.collapsed.set(new Set());
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadDebounced();
      });
    });
  }

  /** A measure header was clicked: highest first, then lowest first, then unsorted. */
  public toggleSort(measureIndex: number): void {
    const current = this.effectiveSort();
    if (current?.kind !== 'measure' || current.index !== measureIndex) {
      this.viewSort.set({ kind: 'measure', index: measureIndex, descending: true });
    } else {
      this.viewSort.set(current.descending ? { ...current, descending: false } : null);
    }
    this.reloadForSort();
  }

  /** A dimension header was clicked: A–Z, then Z–A, then the default order. */
  public toggleFieldSort(fieldIndex: number): void {
    const current = this.effectiveSort();
    if (current?.kind !== 'field' || current.index !== fieldIndex) {
      this.viewSort.set({ kind: 'field', index: fieldIndex, descending: false });
    } else {
      this.viewSort.set(current.descending ? null : { ...current, descending: true });
    }
    this.reloadForSort();
  }

  /** A measure header's sort state, for aria-sort and its icon. */
  public sortState(column: PivotValueColumn): 'ascending' | 'descending' | 'none' {
    const sort = this.effectiveSort();
    if (sort?.kind !== 'measure' || sort.index !== column.measureIndex) return 'none';
    return sort.descending ? 'descending' : 'ascending';
  }

  /** A dimension header's sort state, for aria-sort and its icon. */
  public fieldSortState(column: PivotDimensionColumn): 'ascending' | 'descending' | 'none' {
    const sort = this.effectiveSort();
    if (sort?.kind !== 'field' || sort.index !== column.fieldIndex) return 'none';
    return sort.descending ? 'descending' : 'ascending';
  }

  /** Folds or unfolds the rows under a subtotal. */
  public toggleGroup(row: PivotDisplayRow, event: Event): void {
    event.stopPropagation();
    this.collapsed.update((collapsed) => {
      const next = new Set(collapsed);
      if (!next.delete(row.groupKey)) next.add(row.groupKey);
      return next;
    });
  }

  public isCollapsed(row: PivotDisplayRow): boolean {
    return this.collapsed().has(row.groupKey);
  }

  /** The value cell's highlight from its measure's first matching conditional-format rule. */
  public valueClass(column: PivotValueColumn, row: PivotDisplayRow): string | null {
    const rules: FormatRule[] | undefined = this.measureConfig(column.measureIndex)?.formatRules;
    const style = matchFormatRule(row.values[column.valueIndex]?.value, rules);
    return style ? FORMAT_STYLE_CLASS[style] : null;
  }

  /** How long a value's data bar is, as a percentage of its column's range; null for no bar. */
  public barPercent(column: PivotValueColumn, row: PivotDisplayRow): number | null {
    if (row.isSubtotal) return null;
    const range = this.valueRanges().get(column.valueIndex);
    return range
      ? dataBarPercent(row.values[column.valueIndex]?.value, range.min, range.max)
      : null;
  }

  /** Whether clicking a cell can open the rows behind it. */
  public canDrill(row: PivotDisplayRow, column: PivotValueColumn | null): boolean {
    if (!row.drill) return false;
    if (column?.columnKeyIndex == null) return true;
    return !!this.source.result()?.columnKeys?.[column.columnKeyIndex]?.drill;
  }

  /** Opens the rows behind a row (a dimension cell) or one of its values (a value cell), as a table. */
  public drill(row: PivotDisplayRow, column: PivotValueColumn | null): void {
    const datasetId = this.datasetId();
    if (!datasetId || !this.canDrill(row, column)) return;

    const data = this.source.result()!;
    const columnKey =
      column?.columnKeyIndex != null ? data.columnKeys![column.columnKeyIndex] : null;
    const parts = [...row.path, ...(columnKey?.labels ?? [])];
    const title = [this.config().title?.trim() || 'Pivot', ...parts].join(' › ');

    this.dialog.open<void, DrillThroughDialogData>(DrillThroughDialogComponent, {
      data: {
        datasetId,
        title,
        filter: combineFilters(this.effectiveFilter(), row.drill, columnKey?.drill ?? null),
      },
      ariaLabelledBy: 'drill-through-title',
    });
  }

  /** Retries the last query after a load failure. */
  public retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  /** The pivot as CSV rows: a header, one line per row (subtotals included), then the grand total. */
  protected exportCsv(): string | null {
    const data = this.source.result();
    if (!data) return null;

    const columns = this.valueColumns();
    const blocks = data.columnKeys ?? [];
    const valueHeader = (c: PivotValueColumn): string => {
      const label =
        data.measures.find((m) => Number(m.key.slice(1)) === c.measureIndex)?.label ?? '';
      if (!this.crossTab()) return label;
      const block =
        c.columnKeyIndex === null ? 'Total' : blocks[c.columnKeyIndex].labels.join(' · ');
      return `${block} – ${label}`;
    };
    const header = [...data.rowFields.map((f) => f.label), ...columns.map(valueHeader)];
    // Raw numeric measure values (not the £/% display) so the CSV drops straight into a spreadsheet.
    const rowCells = (r: PivotRow): unknown[] => [
      ...r.dimensions,
      ...columns.map((c) => r.values[c.valueIndex]?.value ?? ''),
    ];
    const rows = data.rows.map(rowCells);
    if (data.grandTotal) rows.push(rowCells(data.grandTotal));
    return toCsv([header, ...rows]);
  }

  protected exportName(): string {
    return this.config().title?.trim() || 'pivot';
  }

  /** Source-derived signals, exposed as getters so their backing field stays below the public block. */
  public get loading(): Signal<boolean> {
    return this.source.loading;
  }
  public get error(): Signal<boolean> {
    return this.source.error;
  }

  private measureConfig(
    measureIndex: number,
  ): PivotTableWidgetConfig['measures'][number] | undefined {
    return this.config().measures[measureIndex];
  }

  private reloadForSort(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }
}
