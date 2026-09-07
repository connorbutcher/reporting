import { Component, Signal, computed, effect, inject, input, untracked } from '@angular/core';
import { TableModule } from 'primeng/table';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter';
import { PivotTableWidgetConfig } from '../../../../core/models/report';
import { PivotQueryResult, PivotRow } from '../../../../core/models/widget-query';
import { resolveWidgetFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';

/** One rendered column of the pivot: a dimension or a measure, with its display alignment. */
interface PivotColumn {
  label: string;
  align: 'left' | 'right';
  isMeasure: boolean;
}

/** A row flattened to display strings aligned to {@link PivotTableWidgetComponent.columns}. */
interface PivotDisplayRow {
  cells: string[];
  isGrandTotal: boolean;
}

/** A CSV cell, quoted and escaped only when it contains a comma, quote, or newline. */
function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

@Component({
  selector: 'app-pivot-table-widget',
  imports: [TableModule],
  templateUrl: './pivot-table-widget.component.html',
  styleUrl: './pivot-table-widget.component.scss',
})
export class PivotTableWidgetComponent {
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
      ...data.rowFields.map((f) => ({ label: f.label, align: 'left' as const, isMeasure: false })),
      ...data.measures.map((m) => ({ label: m.label, align: 'right' as const, isMeasure: true })),
    ];
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

      // The config stores the sort measure by id; the request wants its position in the measures list.
      const sortIndex = config.sortMeasureId
        ? measures.findIndex((m) => m.id === config.sortMeasureId)
        : -1;

      return this.datasetApi.queryPivot(datasetId, {
        filter: this.effectiveFilter(),
        rowFields: config.rowFields,
        measures: measures.map((m) => ({
          columnId: m.columnId,
          aggregate: m.aggregate,
          label: m.label,
        })),
        sortMeasureIndex: sortIndex >= 0 ? sortIndex : null,
        sortDescending: config.sortDescending,
        showGrandTotal: config.showGrandTotal,
      });
    },
  });

  constructor() {
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
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadDebounced();
      });
    });
  }

  /** Retries the last query after a load failure. */
  public retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  /** Saves the pivot as a CSV: a header, one line per group, then the grand total. */
  public downloadCsv(): void {
    const data = this.source.result();
    if (!data) return;

    const header = [...data.rowFields.map((f) => f.label), ...data.measures.map((m) => m.label)];
    const lines = [header.map(csvCell).join(',')];
    // Raw numeric measure values (not the £/% display) so the CSV drops straight into a spreadsheet.
    const rowLine = (r: PivotRow): string =>
      [...r.dimensions, ...r.values.map((v) => v.value ?? '')].map(csvCell).join(',');
    for (const row of data.rows) lines.push(rowLine(row));
    if (data.grandTotal) lines.push(rowLine(data.grandTotal));

    const name = this.config().title?.trim() || 'pivot';
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    // Give the click a beat to start before releasing the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
