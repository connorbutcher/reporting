import { Component, Signal, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { TableModule } from 'primeng/table';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter';
import { PivotTableWidgetConfig } from '../../../../core/models/report';
import { PivotQueryResult, PivotRow } from '../../../../core/models/widget-query';
import { toCsv } from '../csv.util';
import { resolveWidgetFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';
import { DataWidgetBase } from '../data-widget-base';
import { WidgetCountBarComponent } from '../widget-count-bar/widget-count-bar.component';
import { WidgetExportActionsComponent } from '../widget-export-actions/widget-export-actions.component';
import { WidgetStatusComponent } from '../widget-status/widget-status.component';

/** One rendered column of the pivot: a dimension or a measure, with its display alignment. */
interface PivotColumn {
  label: string;
  align: 'left' | 'right';
  isMeasure: boolean;
  /** For a measure, its position in the widget's configured measures (what a sort request names); null for a dimension. */
  measureIndex: number | null;
}

/** A sort by one measure; the reader's session choice or the report's saved default. */
interface PivotSort {
  index: number;
  descending: boolean;
}

/** A row flattened to display strings aligned to {@link PivotTableWidgetComponent.columns}. */
interface PivotDisplayRow {
  cells: string[];
  isGrandTotal: boolean;
}

@Component({
  selector: 'app-pivot-table-widget',
  imports: [TableModule, WidgetCountBarComponent, WidgetExportActionsComponent, WidgetStatusComponent],
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

  /** The header columns: one per dimension (left) then one per measure (right). */
  public readonly columns = computed<PivotColumn[]>(() => {
    const data = this.source.result();
    if (!data) return [];
    return [
      ...data.rowFields.map((f) => ({
        label: f.label,
        align: 'left' as const,
        isMeasure: false,
        measureIndex: null,
      })),
      // The key is "m<request position>" — the server drops unusable measures but keeps the numbering.
      ...data.measures.map((m) => ({
        label: m.label,
        align: 'right' as const,
        isMeasure: true,
        measureIndex: Number(m.key.slice(1)),
      })),
    ];
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
    const index = config.sortMeasureId ? config.measures.findIndex((m) => m.id === config.sortMeasureId) : -1;
    return index >= 0 ? { index, descending: config.sortDescending } : null;
  });

  /**
   * The grouped rows, each flattened to display strings in column order. A dimension cell is blanked
   * when it — and every dimension to its left — repeats the row above, so a nested grouping reads as
   * an outline (the parent value shown once) rather than repeating the parent on every child row.
   */
  public readonly rows = computed<PivotDisplayRow[]>(() => {
    const data = this.source.result();
    if (!data) return [];

    const dimCount = data.rowFields.length;
    let previous: string[] | null = null;

    return data.rows.map((row) => {
      const display = this.toDisplayRow(row);
      const cells = [...display.cells];
      if (previous) {
        // Blank leading dimension cells while the whole prefix still matches the row above.
        let samePrefix = true;
        for (let i = 0; i < dimCount; i++) {
          if (samePrefix && row.dimensions[i] === previous[i]) cells[i] = '';
          else samePrefix = false;
        }
      }
      previous = row.dimensions;
      return { cells, isGrandTotal: display.isGrandTotal };
    });
  });

  /** The totals row when the server returned one, else null. */
  public readonly grandTotal = computed<PivotDisplayRow | null>(() => {
    const total = this.source.result()?.grandTotal;
    return total ? this.toDisplayRow(total) : null;
  });

  public readonly isTruncated = computed(() => !!this.source.result()?.truncated);

  /** What is narrowing the rows, for the count bar's hover text. */
  public readonly filterLines = computed(() =>
    this.describeFilters([this.effectiveFilter()], this.source.columns()),
  );

  /** The always-on footer text, mirroring the data table's "N of M rows". */
  public readonly countLabel = computed(() => {
    const data = this.source.result();
    if (!data) return '';
    const groups = data.rows.length;
    const matched = data.matchedRowCount;
    if (this.isTruncated()) return `Showing first ${groups} groups of ${matched.toLocaleString()} rows`;
    const total = data.totalRowCount;
    const filtered = matched !== total;
    const rowsText = `${matched.toLocaleString()} row${matched === 1 ? '' : 's'}`;
    return filtered
      ? `${groups} group${groups === 1 ? '' : 's'} · ${matched.toLocaleString()} of ${total.toLocaleString()} rows`
      : `${groups} group${groups === 1 ? '' : 's'} · ${rowsText}`;
  });

  private readonly datasetApi = inject(DatasetApiService);

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

      // The request names the sort measure by its position in the measures list.
      const sort = this.effectiveSort();

      return this.datasetApi.queryPivot(datasetId, {
        filter: this.effectiveFilter(),
        rowFields: config.rowFields,
        measures: measures.map((m) => ({
          columnId: m.columnId,
          aggregate: m.aggregate,
          label: m.label,
        })),
        sortMeasureIndex: sort?.index ?? null,
        sortDescending: sort?.descending ?? false,
        showGrandTotal: config.showGrandTotal,
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

    // Re-aggregate whenever the grouping, measures, totals toggle, or filter change.
    effect(() => {
      if (!this.configured()) return;
      this.effectiveFilter();
      this.config().rowFields;
      this.config().measures;
      this.config().sortMeasureId;
      this.config().sortDescending;
      this.config().showGrandTotal;

      untracked(() => {
        // A configuration change resets the view to the report's own sort.
        this.viewSort.set(undefined);
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadDebounced();
      });
    });
  }

  /** A measure header was clicked: highest first, then lowest first, then unsorted. */
  public toggleSort(measureIndex: number): void {
    const current = this.effectiveSort();
    if (current?.index !== measureIndex) this.viewSort.set({ index: measureIndex, descending: true });
    else this.viewSort.set(current.descending ? { index: measureIndex, descending: false } : null);

    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  /** A column header's sort state, for aria-sort and its icon. */
  public sortState(column: PivotColumn): 'ascending' | 'descending' | 'none' {
    const sort = this.effectiveSort();
    if (column.measureIndex === null || sort?.index !== column.measureIndex) return 'none';
    return sort.descending ? 'descending' : 'ascending';
  }

  /** Retries the last query after a load failure. */
  public retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  /** The pivot as CSV rows: a header, one line per group, then the grand total. */
  protected exportCsv(): string | null {
    const data = this.source.result();
    if (!data) return null;

    const header = [...data.rowFields.map((f) => f.label), ...data.measures.map((m) => m.label)];
    // Raw numeric measure values (not the £/% display) so the CSV drops straight into a spreadsheet.
    const rowCells = (r: PivotRow): unknown[] => [...r.dimensions, ...r.values.map((v) => v.value ?? '')];
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

  /** Flattens a pivot row to display strings in column order: dimensions then measures. */
  private toDisplayRow(row: PivotRow): PivotDisplayRow {
    return {
      cells: [...row.dimensions, ...row.values.map((v) => v.displayValue ?? '')],
      isGrandTotal: row.isGrandTotal,
    };
  }
}
