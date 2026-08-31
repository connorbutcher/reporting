import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  ChartSeriesBinding,
  ChartSymbol,
  ChartToleranceBand,
  LineDashStyle,
  bandedChartColumns,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter.model';
import { ValidationIssue } from './validation-issue';
import { ModelSources } from './widget-model-base';

/**
 * One dataset's contribution to a chart: its dataset, axes, per-value split, and row filter,
 * each editable in isolation. A chart owns one or more; overlaying several plots two datasets
 * against each other. The filter is a child node, so its problems and unsaved changes roll up.
 */
export class ChartBindingModel extends EditorNode {
  public readonly id: string;
  /** Null until the user binds this series to a dataset. */
  public readonly datasetId = signal<number | null>(null);
  public readonly xColumnId = signal<string | null>(null);
  public readonly yColumnId = signal<string | null>(null);
  /** Splits this binding into a coloured series per distinct value; null plots one. */
  public readonly seriesColumnId = signal<string | null>(null);
  /** Which value axis to plot against, by id; null falls back to the primary axis. */
  public readonly yAxisId = signal<string | null>(null);
  /** Null uses the palette. */
  public readonly color = signal<string | null>(null);
  /** Null uses the chart kind's default marker. */
  public readonly symbol = signal<ChartSymbol | null>(null);
  /** Null draws solid. */
  public readonly dashStyle = signal<LineDashStyle | null>(null);
  /** Blank falls back to the dataset/column name in the legend. */
  public readonly label = signal('');
  public readonly filter: FilterGroupModel;

  public readonly schema: Signal<DatasetSchema | null>;
  /** Numeric columns — for anything needing a measure (a bar's value, a band's axis). */
  public readonly numericColumns: Signal<DatasetColumn[]>;
  /** Columns an axis can plot: numeric (value), text (category), or date (time). */
  public readonly axisColumns: Signal<DatasetColumn[]>;

  constructor(
    binding: ChartSeriesBinding,
    sources: ModelSources,
    widgetId: string,
    toleranceBands: Signal<readonly ChartToleranceBand[]>,
  ) {
    super();
    this.id = binding.id;
    this.datasetId.set(binding.datasetId);
    this.xColumnId.set(binding.xColumnId);
    this.yColumnId.set(binding.yColumnId);
    this.seriesColumnId.set(binding.seriesColumnId);
    this.yAxisId.set(binding.yAxisId);
    this.color.set(binding.color ?? null);
    this.symbol.set(binding.symbol ?? null);
    this.dashStyle.set(binding.dashStyle ?? null);
    this.label.set(binding.label);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.numericColumns = computed(
      () => this.schema()?.columns.filter((c) => c.type === 'int' || c.type === 'double') ?? [],
    );
    this.axisColumns = computed(
      () =>
        this.schema()?.columns.filter(
          (c) => c.type === 'int' || c.type === 'double' || c.type === 'string' || c.type === 'dateTime',
        ) ?? [],
    );

    this.filter = new FilterGroupModel(binding.filter, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // A chart filter offers the whole dataset; a tolerance filter keys off this
      // binding's axis columns that carry a band.
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

  /** Swapping dataset invalidates every column choice, since they belong to the old schema. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.xColumnId.set(null);
    this.yColumnId.set(null);
    this.seriesColumnId.set(null);
    this.filter.clear();
  }

  public toDto(): ChartSeriesBinding {
    return {
      id: this.id,
      datasetId: this.datasetId(),
      xColumnId: this.xColumnId(),
      yColumnId: this.yColumnId(),
      seriesColumnId: this.seriesColumnId(),
      yAxisId: this.yAxisId(),
      color: this.color(),
      symbol: this.symbol(),
      dashStyle: this.dashStyle(),
      label: this.label(),
      filter: this.filter.toDto(),
    };
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.filter];
  }

  // Axis/dataset problems stay on the widget, read through the primary binding, so issue
  // ids and text are unchanged from the single-dataset era.
  public override ownIssues(): ValidationIssue[] {
    return [];
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }
}
