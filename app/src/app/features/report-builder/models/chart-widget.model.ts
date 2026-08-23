import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset.model';
import {
  ChartSeriesBinding,
  ChartToleranceBand,
  ChartTooltipColumn,
  ChartWidget,
  ChartWidgetConfigBase,
  EMPTY_CHART_BINDING,
  readChartBindings,
} from '../../../core/models/report.model';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter.model';
import { ValidationIssue } from './validation-issue';
import { ModelSources, WidgetModel } from './widget-model-base';

/**
 * One dataset's contribution to a chart: its own dataset, axes, per-value split,
 * and row filter, each editable in isolation. A chart owns one or more of these;
 * overlaying several is how two datasets are plotted against each other. Its
 * filter is its child node, so problems and unsaved changes roll up through it.
 */
export class ChartBindingModel extends EditorNode {
  readonly id: string;
  /** Null until the user binds this series to a dataset. */
  readonly datasetId = signal<number | null>(null);
  readonly xColumnId = signal<string | null>(null);
  readonly yColumnId = signal<string | null>(null);
  /** Splits this binding into a separate coloured series per distinct value. Null plots one. */
  readonly seriesColumnId = signal<string | null>(null);
  /** Blank falls back to the dataset/column name in the legend. */
  readonly label = signal('');
  /** Rows this binding plots, narrowed server-side. */
  readonly filter: FilterGroupModel;

  /** This binding's dataset schema, once loaded. */
  readonly schema: Signal<DatasetSchema | null>;
  /** Columns the axes can plot — only numeric types make sense on a chart. */
  readonly numericColumns: Signal<DatasetColumn[]>;

  constructor(binding: ChartSeriesBinding, sources: ModelSources, widgetId: string) {
    super();
    this.id = binding.id;
    this.datasetId.set(binding.datasetId);
    this.xColumnId.set(binding.xColumnId);
    this.yColumnId.set(binding.yColumnId);
    this.seriesColumnId.set(binding.seriesColumnId);
    this.label.set(binding.label);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.numericColumns = computed(
      () => this.schema()?.columns.filter((c) => c.type === 'int' || c.type === 'double') ?? [],
    );

    this.filter = new FilterGroupModel(binding.filter, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // Unlike a table, a chart doesn't show an enumerable set of columns, so
      // its filter offers the whole dataset rather than a narrowed list.
      view: { kind: 'widgetFilters', widgetId, bindingId: this.id },
      // Namespaced per binding so overlaid datasets' filter issues stay distinct.
      ownerId: `${widgetId}:${this.id}`,
      widgetId,
    });
  }

  /** Swapping dataset invalidates every column choice, since they belong to the old schema. */
  setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.xColumnId.set(null);
    this.yColumnId.set(null);
    this.seriesColumnId.set(null);
    this.filter.clear();
  }

  toDto(): ChartSeriesBinding {
    return {
      id: this.id,
      datasetId: this.datasetId(),
      xColumnId: this.xColumnId(),
      yColumnId: this.yColumnId(),
      seriesColumnId: this.seriesColumnId(),
      label: this.label(),
      filter: this.filter.toDto(),
    };
  }

  protected override childNodes(): readonly EditorNode[] {
    return [this.filter];
  }

  // Axis/dataset problems stay on the widget for now, reading through the primary
  // binding, so issue ids and text are unchanged from the single-dataset era.
  protected override ownIssues(): ValidationIssue[] {
    return [];
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }
}

/**
 * Shared behaviour for every chart kind (scatter, line, and future bar/area).
 * Owns the series bindings, axes, tolerance bands, tooltip columns, and
 * appearance — everything that isn't specific to how one kind is drawn. Concrete
 * subclasses add their own presentation signals and assemble their own DTO.
 *
 * Each binding carries its own dataset/axes/filter (see {@link ChartBindingModel});
 * while the editor still targets a single binding, the dataset/axis/series/filter
 * accessors below delegate to {@link primaryBinding} so the panel and validation
 * are unchanged. Tolerance bands, tooltip columns, and appearance are chart-wide.
 */
export abstract class ChartWidgetModel extends WidgetModel {
  /** The datasets overlaid on this chart, in draw order. Always at least one. */
  readonly bindings = signal<readonly ChartBindingModel[]>([]);

  readonly xAxisLabel = signal('');
  readonly yAxisLabel = signal('');
  readonly showLegend = signal(true);
  readonly pointSize = signal(8);

  /** Reference lines per spec, each resolved against its own limits dataset. */
  readonly toleranceBands = signal<readonly ChartToleranceBand[]>([]);
  /** Extra fields shown in a point's tooltip, beyond X/Y. */
  readonly tooltipColumns = signal<readonly ChartTooltipColumn[]>([]);

  /** Kept so new bindings added later can be wired to the same schema/catalogue look-ups. */
  private readonly sources: ModelSources;

  protected constructor(widget: ChartWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;
    this.sources = sources;

    this.xAxisLabel.set(config.xAxisLabel);
    this.yAxisLabel.set(config.yAxisLabel);
    this.showLegend.set(config.showLegend);
    this.pointSize.set(config.pointSize);
    this.toleranceBands.set(config.toleranceBands ?? []);
    this.tooltipColumns.set(config.tooltipColumns ?? []);

    // A config that already has `bindings` keeps their ids; a new or pre-bindings
    // legacy config is folded by readChartBindings into one binding whose id must
    // be minted fresh here — its constant fold id is only for stateless viewer
    // reads, whereas the model owns a stable id it persists on save.
    const hadBindings = !!config.bindings?.length;
    this.bindings.set(
      readChartBindings(config).map(
        (b) =>
          new ChartBindingModel(hadBindings ? b : { ...b, id: crypto.randomUUID() }, sources, this.id),
      ),
    );
  }

  /** The first binding — the one the delegating accessors below read through. */
  protected primaryBinding(): ChartBindingModel {
    return this.bindings()[0];
  }

  /** One binding by id, or null when it isn't on this chart (e.g. just removed). */
  binding(id: string): ChartBindingModel | null {
    return this.bindings().find((b) => b.id === id) ?? null;
  }

  /** Appends a fresh, unbound series to overlay another dataset; returns its id. */
  addBinding(): string {
    const dto: ChartSeriesBinding = { id: crypto.randomUUID(), ...EMPTY_CHART_BINDING };
    const model = new ChartBindingModel(dto, this.sources, this.id);
    this.bindings.update((bindings) => [...bindings, model]);
    return model.id;
  }

  /** Removes a series; the last one can't be removed, so a chart always has a binding. */
  removeBinding(id: string): void {
    this.bindings.update((bindings) =>
      bindings.length <= 1 ? bindings : bindings.filter((b) => b.id !== id),
    );
  }

  // --- primary-binding accessors -------------------------------------------
  // Kept so the panel, validation, and schema-loading read the same shape they
  // did when this state lived directly on the widget. Removed once callers move
  // to iterate `bindings` (step 3/4).

  get datasetId(): WritableSignal<number | null> {
    return this.primaryBinding().datasetId;
  }
  get xColumnId(): WritableSignal<string | null> {
    return this.primaryBinding().xColumnId;
  }
  get yColumnId(): WritableSignal<string | null> {
    return this.primaryBinding().yColumnId;
  }
  get seriesColumnId(): WritableSignal<string | null> {
    return this.primaryBinding().seriesColumnId;
  }
  get filter(): FilterGroupModel {
    return this.primaryBinding().filter;
  }
  get schema(): Signal<DatasetSchema | null> {
    return this.primaryBinding().schema;
  }
  get numericColumns(): Signal<DatasetColumn[]> {
    return this.primaryBinding().numericColumns;
  }

  /** Swapping dataset invalidates the primary binding's columns, and the chart-wide tooltip. */
  setDataset(datasetId: number | null): void {
    const primary = this.primaryBinding();
    if (datasetId === primary.datasetId()) return;
    primary.setDataset(datasetId);
    // Tooltip columns are chart-wide but keyed to the old schema, so they clear too.
    this.tooltipColumns.set([]);
  }

  addToleranceBand(): string {
    const band: ChartToleranceBand = {
      id: crypto.randomUUID(),
      axis: 'y',
      // 0 / '' are the "not pointed at a spec yet" placeholders; a band with these is left out of
      // the saved config (see chartConfigBaseDto) until the user finishes filling it in.
      sourceDatasetId: 0,
      sourceRowId: '',
      minColumnId: '',
      maxColumnId: '',
    };
    this.toleranceBands.update((bands) => [...bands, band]);
    return band.id;
  }

  removeToleranceBand(id: string): void {
    this.toleranceBands.update((bands) => bands.filter((b) => b.id !== id));
  }

  updateToleranceBand(id: string, patch: Partial<Omit<ChartToleranceBand, 'id'>>): void {
    this.toleranceBands.update((bands) => bands.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  toleranceBand(id: string): ChartToleranceBand | null {
    return this.toleranceBands().find((b) => b.id === id) ?? null;
  }

  /** Adds the first dataset column not already shown in the tooltip. */
  addTooltipColumn(): void {
    const used = new Set(this.tooltipColumns().map((c) => c.columnId));
    const next = (this.schema()?.columns ?? []).find((c) => !used.has(c.id));
    if (!next) return;
    this.tooltipColumns.update((cols) => [...cols, { columnId: next.id }]);
  }

  removeTooltipColumn(columnId: string): void {
    this.tooltipColumns.update((cols) => cols.filter((c) => c.columnId !== columnId));
  }

  updateTooltipColumn(
    columnId: string,
    patch: Partial<Omit<ChartTooltipColumn, 'columnId'>>,
  ): void {
    this.tooltipColumns.update((cols) =>
      cols.map((c) => (c.columnId === columnId ? { ...c, ...patch } : c)),
    );
  }

  /** Swaps which column an existing tooltip entry shows, dropping a duplicate if that column is already added. */
  replaceTooltipColumn(oldColumnId: string, newColumnId: string): void {
    if (oldColumnId === newColumnId) return;
    this.tooltipColumns.update((cols) =>
      cols
        .filter((c) => c.columnId !== newColumnId)
        .map((c) => (c.columnId === oldColumnId ? { ...c, columnId: newColumnId } : c)),
    );
  }

  /** The chart config fields common to every kind, for a subclass to spread into its own DTO. */
  protected chartConfigBaseDto(): Omit<ChartWidgetConfigBase, 'type'> {
    return {
      ...this.baseConfigDto(),
      bindings: this.bindings().map((b) => b.toDto()),
      xAxisLabel: this.xAxisLabel(),
      yAxisLabel: this.yAxisLabel(),
      showLegend: this.showLegend(),
      pointSize: this.pointSize(),
      // A band the user hasn't finished pointing at a spec yet is left out — the
      // server's Guid fields can't parse the empty placeholder, and a half-built
      // band shouldn't block autosave. It stays in the signal above so the panel
      // that's mid-edit can still find it.
      toleranceBands: this.toleranceBands()
        .filter((b) => b.sourceDatasetId && b.sourceRowId && b.minColumnId && b.maxColumnId)
        .map((b) => ({ ...b })),
      tooltipColumns: this.tooltipColumns().map((c) => ({ ...c })),
    };
  }

  abstract override toDto(): ChartWidget;

  protected override childNodes(): readonly EditorNode[] {
    return this.bindings();
  }

  // Validates every binding, not just the first, so a half-configured overlaid
  // dataset (which buildChartQuery would silently skip) still raises a warning.
  protected override ownIssues(): ValidationIssue[] {
    const name = this.label();
    const bindings = this.bindings();
    const multi = bindings.length > 1;
    const issues: ValidationIssue[] = [];

    bindings.forEach((binding, i) => {
      const where = multi ? `${name} (dataset ${i + 1})` : name;
      if (!binding.datasetId()) {
        issues.push({
          id: `${this.id}:noDataset:${binding.id}`,
          severity: 'warning',
          title: `${where} has no dataset`,
          detail: 'Pick a dataset so the chart has something to plot.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        });
      } else if (!binding.xColumnId() || !binding.yColumnId()) {
        issues.push({
          id: `${this.id}:noAxes:${binding.id}`,
          severity: 'warning',
          title: `${where} is missing an axis`,
          detail: 'Pick both an X and a Y column to plot.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        });
      }
    });

    return issues;
  }
}
