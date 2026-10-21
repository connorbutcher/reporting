import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  ChartSeriesBinding,
  ChartSeriesRenderAs,
  ChartSort,
  ChartSymbol,
  ChartToleranceBand,
  LineDashStyle,
  bandedChartColumns,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter';
import { ValidationIssue } from './validation-issue';
import { ModelSources } from './sources/model-sources';
import { ColumnTypes } from './column-types';

/**
 * One dataset's contribution to a chart: dataset, axes, split and row filter. The filter is a child
 * node, so its issues and unsaved changes roll up.
 */
export class ChartBindingModel extends EditorNode {
  public readonly id: string;
  public readonly datasetId = signal<number | null>(null);
  public readonly xColumnId = signal<string | null>(null);
  public readonly yColumnId = signal<string | null>(null);
  /** Scatter bubble size; ignored by other chart kinds. */
  public readonly sizeColumnId = signal<string | null>(null);
  /**
   * A bar chart's measures or a histogram's binned columns; empty on point and box charts. Edit
   * through {@link setValueColumnIds} or {@link setHistogramValueColumnIds}, which mirror the first
   * into the single-column field so single-measure readers still resolve one.
   */
  public readonly valueColumnIds = signal<readonly string[]>([]);
  /** The bar editor's measures: the explicit list, else a legacy single {@link yColumnId}. */
  public readonly barValueColumnIds = computed<string[]>(() => {
    const list = this.valueColumnIds();
    if (list.length) return [...list];
    const y = this.yColumnId();
    return y ? [y] : [];
  });
  /** The histogram editor's columns: the explicit list, else a legacy single {@link xColumnId}. */
  public readonly histogramValueColumnIds = computed<string[]>(() => {
    const list = this.valueColumnIds();
    if (list.length) return [...list];
    const x = this.xColumnId();
    return x ? [x] : [];
  });
  /** Splits into a coloured series per distinct value; null plots one. */
  public readonly seriesColumnId = signal<string | null>(null);
  /** Combination charts only. */
  public readonly renderAs = signal<ChartSeriesRenderAs>('bar');
  /** Null plots against the primary axis. */
  public readonly yAxisId = signal<string | null>(null);
  /** Null uses the palette. */
  public readonly color = signal<string | null>(null);
  /** Null uses the chart kind's default marker. */
  public readonly symbol = signal<ChartSymbol | null>(null);
  /** Null draws solid. */
  public readonly dashStyle = signal<LineDashStyle | null>(null);
  /** Blank falls back to the dataset or column name. */
  public readonly label = signal('');
  /** Draw order for a point chart's rows; null keeps X ascending. Grouping charts use the chart's sort. */
  public readonly sort = signal<ChartSort | null>(null);
  public readonly filter: FilterGroupModel;

  public readonly schema: Signal<DatasetSchema | null>;
  public readonly numericColumns: Signal<DatasetColumn[]>;
  /** Columns an axis can plot: numeric, text or date. */
  public readonly axisColumns: Signal<DatasetColumn[]>;

  /** For issue titles and navigation only. */
  private readonly widgetId: string;

  constructor(
    binding: ChartSeriesBinding,
    sources: ModelSources,
    widgetId: string,
    toleranceBands: Signal<readonly ChartToleranceBand[]>,
  ) {
    super();
    this.id = binding.id;
    this.widgetId = widgetId;
    this.datasetId.set(binding.datasetId);
    this.xColumnId.set(binding.xColumnId);
    this.yColumnId.set(binding.yColumnId);
    this.sizeColumnId.set(binding.sizeColumnId ?? null);
    // Stored as-is: a legacy bar binding leaves this empty and is folded from yColumnId on read.
    this.valueColumnIds.set(binding.valueColumnIds?.filter((id): id is string => !!id) ?? []);
    this.seriesColumnId.set(binding.seriesColumnId);
    this.renderAs.set(binding.renderAs ?? 'bar');
    this.yAxisId.set(binding.yAxisId);
    this.color.set(binding.color ?? null);
    this.symbol.set(binding.symbol ?? null);
    this.dashStyle.set(binding.dashStyle ?? null);
    this.label.set(binding.label);
    this.sort.set(binding.sort ?? null);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.numericColumns = computed(
      () => this.schema()?.columns.filter((c) => ColumnTypes.isNumeric(c.type)) ?? [],
    );
    this.axisColumns = computed(
      () =>
        this.schema()?.columns.filter(
          (c) =>
            c.type === 'int' || c.type === 'double' || c.type === 'string' || c.type === 'dateTime',
        ) ?? [],
    );

    this.filter = new FilterGroupModel(binding.filter, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // Tolerance operators key off this binding's banded axis columns.
      tolerantColumns: computed(
        () =>
          new Set(
            bandedChartColumns(toleranceBands(), {
              xColumnId: this.xColumnId(),
              yColumnId: this.yColumnId(),
            }),
          ),
      ),
      view: { kind: 'widgetFilters', widgetId, bindingId: this.id },
      // Namespaced per binding so overlaid datasets' filter issues stay distinct.
      ownerId: `${widgetId}:${this.id}`,
      widgetId,
    });
  }

  public setValueColumnIds(ids: readonly string[]): void {
    const clean = ids.filter((id) => !!id);
    this.valueColumnIds.set(clean);
    this.yColumnId.set(clean[0] ?? null);
  }

  public setHistogramValueColumnIds(ids: readonly string[]): void {
    const clean = ids.filter((id) => !!id);
    this.valueColumnIds.set(clean);
    this.xColumnId.set(clean[0] ?? null);
  }

  /** Clears every column choice, since they belong to the old schema. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.xColumnId.set(null);
    this.yColumnId.set(null);
    this.sizeColumnId.set(null);
    this.valueColumnIds.set([]);
    this.seriesColumnId.set(null);
    this.filter.clear();
  }

  public toDto(): ChartSeriesBinding {
    const values = this.valueColumnIds();
    return {
      id: this.id,
      datasetId: this.datasetId(),
      xColumnId: this.xColumnId(),
      yColumnId: this.yColumnId(),
      sizeColumnId: this.sizeColumnId(),
      // Empty stays null so point and box configs are unchanged.
      valueColumnIds: values.length ? [...values] : null,
      seriesColumnId: this.seriesColumnId(),
      // The default stays null so non-combo configs are unchanged.
      renderAs: this.renderAs() === 'bar' ? null : this.renderAs(),
      yAxisId: this.yAxisId(),
      color: this.color(),
      symbol: this.symbol(),
      dashStyle: this.dashStyle(),
      label: this.label(),
      filter: this.filter.toDto(),
      sort: this.sort(),
    };
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.filter];
  }

  // Catches a column that was picked but has since been removed from the dataset. Missing
  // dataset or axis picks are reported by the widget.
  public override ownIssues(): ValidationIssue[] {
    const schema = this.schema();
    // A pending schema fetch must not look like a deleted column.
    if (!schema) return [];

    const columnIds = new Set(schema.columns.map((c) => c.id));
    const sort = this.sort();
    const fields: [label: string, columnIds: readonly (string | null)[]][] = [
      ['X axis', [this.xColumnId()]],
      ['Y axis', [this.yColumnId()]],
      ['size', [this.sizeColumnId()]],
      ['split-by', [this.seriesColumnId()]],
      ['value', this.valueColumnIds()],
      ['sort', sort?.by === 'column' ? [sort.columnId] : []],
    ];
    const brokenFields = fields
      .filter(([, ids]) => ids.some((id) => !!id && !columnIds.has(id)))
      .map(([label]) => label);

    if (brokenFields.length === 0) return [];

    return [
      {
        id: `${this.id}:missingColumn`,
        severity: 'error',
        title: 'A chart series points at a column that no longer exists',
        detail: `Its ${brokenFields.join(', ')} column was removed from "${schema.name}". Pick a new one or remove the series.`,
        widgetId: this.widgetId,
        view: { kind: 'chartSeries', widgetId: this.widgetId, bindingId: this.id },
      },
    ];
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }
}
