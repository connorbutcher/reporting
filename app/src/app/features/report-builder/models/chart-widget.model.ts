import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  ChartSeriesBinding,
  ChartToleranceBand,
  ChartTooltipColumn,
  ChartValueAxis,
  ChartWidget,
  ChartWidgetConfigBase,
  EMPTY_CHART_BINDING,
  readChartAxes,
} from '../../../core/models/report';
import { ChartBindingModel } from './chart-binding.model';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter.model';
import { ValidationIssue } from './validation-issue';
import { ModelSources, WidgetModel } from './widget-model-base';

/**
 * Shared behaviour for every chart kind (scatter, line, bar). Owns the series bindings, value
 * axes, tolerance bands, tooltip columns, and appearance — everything not specific to how one
 * kind is drawn. Concrete subclasses add their presentation signals and assemble their DTO.
 *
 * Each binding carries its own dataset/axes/filter (see {@link ChartBindingModel}). The editor
 * still targets a single binding, so the dataset/axis/series/filter accessors delegate to
 * {@link primaryBinding}; tolerance bands, tooltip columns, and appearance are chart-wide.
 */
export abstract class ChartWidgetModel extends WidgetModel {
  /** The datasets overlaid on this chart, in draw order. Always at least one. */
  public readonly bindings = signal<readonly ChartBindingModel[]>([]);

  public readonly xAxisLabel = signal('');
  public readonly yAxisLabel = signal('');
  /** The value (Y) axes this chart plots against; the first is the primary. Always at least one. */
  public readonly yAxes = signal<readonly ChartValueAxis[]>([]);
  /** Fixed X-axis bounds (null auto-fits) and log scale — the X counterparts of a value axis's own. */
  public readonly xAxisMin = signal<number | null>(null);
  public readonly xAxisMax = signal<number | null>(null);
  public readonly xLogScale = signal(false);
  /** Mouse-wheel/drag zoom + slider on point charts. */
  public readonly zoom = signal(true);
  public readonly showLegend = signal(true);
  public readonly pointSize = signal(8);

  /** Reference lines per spec, each resolved against its own limits dataset. */
  public readonly toleranceBands = signal<readonly ChartToleranceBand[]>([]);
  /** Extra fields shown in a point's tooltip, beyond X/Y. */
  public readonly tooltipColumns = signal<readonly ChartTooltipColumn[]>([]);

  /** Kept so bindings added later can reuse the same schema/catalogue look-ups. */
  private readonly sources: ModelSources;

  constructor(widget: ChartWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;
    this.sources = sources;

    this.xAxisLabel.set(config.xAxisLabel);
    this.yAxisLabel.set(config.yAxisLabel);
    // Folds a pre-multi-axis config's single yAxisLabel into one primary axis.
    this.yAxes.set(readChartAxes(config));
    this.xAxisMin.set(config.xAxisMin ?? null);
    this.xAxisMax.set(config.xAxisMax ?? null);
    this.xLogScale.set(config.xLogScale ?? false);
    // Charts saved before zoom existed default it on, matching a fresh chart.
    this.zoom.set(config.zoom ?? true);
    this.showLegend.set(config.showLegend);
    this.pointSize.set(config.pointSize);
    this.toleranceBands.set(config.toleranceBands ?? []);
    this.tooltipColumns.set(config.tooltipColumns ?? []);

    // A saved chart carries its bindings; a fresh one seeds a single empty binding to bind.
    const seeded = config.bindings?.length
      ? config.bindings
      : [{ id: crypto.randomUUID(), ...EMPTY_CHART_BINDING }];
    this.bindings.set(seeded.map((b) => new ChartBindingModel(b, sources, this.id, this.toleranceBands)));
  }

  // --- bindings ------------------------------------------------------------

  /** One binding by id, or null when it isn't on this chart (e.g. just removed). */
  public binding(id: string): ChartBindingModel | null {
    return this.bindings().find((b) => b.id === id) ?? null;
  }

  /** Appends a fresh, unbound series to overlay another dataset; returns its id. */
  public addBinding(): string {
    const dto: ChartSeriesBinding = { id: crypto.randomUUID(), ...EMPTY_CHART_BINDING };
    const model = new ChartBindingModel(dto, this.sources, this.id, this.toleranceBands);
    this.bindings.update((bindings) => [...bindings, model]);
    return model.id;
  }

  /** Removes a series; the last one stays, so a chart always has a binding. */
  public removeBinding(id: string): void {
    this.bindings.update((bindings) =>
      bindings.length <= 1 ? bindings : bindings.filter((b) => b.id !== id),
    );
  }

  // --- value axes ----------------------------------------------------------

  /** Appends a fresh value axis (opposite side to balance the plot) and returns its id. */
  public addYAxis(): string {
    const axis: ChartValueAxis = {
      id: crypto.randomUUID(),
      label: '',
      // A second axis is most useful on the right; further ones alternate sides.
      side: this.yAxes().length % 2 === 1 ? 'right' : 'left',
    };
    this.yAxes.update((axes) => [...axes, axis]);
    return axis.id;
  }

  /** Removes a value axis; the primary (first) stays. Bindings and bands on it fall back to the primary. */
  public removeYAxis(id: string): void {
    let removed = false;
    this.yAxes.update((axes) => {
      if (axes.length <= 1 || axes[0].id === id) return axes;
      removed = true;
      return axes.filter((a) => a.id !== id);
    });
    if (!removed) return;

    for (const binding of this.bindings()) {
      if (binding.yAxisId() === id) binding.yAxisId.set(null);
    }
    this.toleranceBands.update((bands) =>
      bands.map((b) => (b.yAxisId === id ? { ...b, yAxisId: null } : b)),
    );
  }

  public updateYAxis(id: string, patch: Partial<Omit<ChartValueAxis, 'id'>>): void {
    this.yAxes.update((axes) => axes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  /** Swapping dataset invalidates the primary binding's columns, and the chart-wide tooltip. */
  public setDataset(datasetId: number | null): void {
    const primary = this.primaryBinding();
    if (datasetId === primary.datasetId()) return;
    primary.setDataset(datasetId);
    // Tooltip columns are chart-wide but keyed to the old schema, so they clear too.
    this.tooltipColumns.set([]);
  }

  // --- tolerance bands -----------------------------------------------------

  public addToleranceBand(): string {
    const band: ChartToleranceBand = {
      id: crypto.randomUUID(),
      axis: 'y',
      // 0 / '' are the "not pointed at a spec yet" placeholders; such a band is left out of
      // the saved config (see chartConfigBaseDto) until the user finishes filling it in.
      sourceDatasetId: 0,
      sourceRowId: '',
      minColumnId: '',
      maxColumnId: '',
    };
    this.toleranceBands.update((bands) => [...bands, band]);
    return band.id;
  }

  public removeToleranceBand(id: string): void {
    this.toleranceBands.update((bands) => bands.filter((b) => b.id !== id));
  }

  public updateToleranceBand(id: string, patch: Partial<Omit<ChartToleranceBand, 'id'>>): void {
    this.toleranceBands.update((bands) => bands.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  public toleranceBand(id: string): ChartToleranceBand | null {
    return this.toleranceBands().find((b) => b.id === id) ?? null;
  }

  // --- tooltip columns -----------------------------------------------------

  /** Adds the first dataset column not already shown in the tooltip. */
  public addTooltipColumn(): void {
    const used = new Set(this.tooltipColumns().map((c) => c.columnId));
    const next = (this.schema()?.columns ?? []).find((c) => !used.has(c.id));
    if (!next) return;
    this.tooltipColumns.update((cols) => [...cols, { columnId: next.id }]);
  }

  public removeTooltipColumn(columnId: string): void {
    this.tooltipColumns.update((cols) => cols.filter((c) => c.columnId !== columnId));
  }

  public updateTooltipColumn(
    columnId: string,
    patch: Partial<Omit<ChartTooltipColumn, 'columnId'>>,
  ): void {
    this.tooltipColumns.update((cols) =>
      cols.map((c) => (c.columnId === columnId ? { ...c, ...patch } : c)),
    );
  }

  /** Swaps which column a tooltip entry shows, dropping a duplicate if that column is already added. */
  public replaceTooltipColumn(oldColumnId: string, newColumnId: string): void {
    if (oldColumnId === newColumnId) return;
    this.tooltipColumns.update((cols) =>
      cols
        .filter((c) => c.columnId !== newColumnId)
        .map((c) => (c.columnId === oldColumnId ? { ...c, columnId: newColumnId } : c)),
    );
  }

  // --- serialisation & validation ------------------------------------------

  /** The chart config fields common to every kind, for a subclass to spread into its own DTO. */
  public chartConfigBaseDto(): Omit<ChartWidgetConfigBase, 'type'> {
    return {
      ...this.baseConfigDto(),
      bindings: this.bindings().map((b) => b.toDto()),
      yAxes: this.yAxes().map((a) => ({ ...a })),
      xAxisLabel: this.xAxisLabel(),
      // Mirror the primary axis's label onto the deprecated flat field so a chart saved here
      // still reads sensibly through any pre-multi-axis code path.
      yAxisLabel: this.yAxes()[0]?.label ?? this.yAxisLabel(),
      xAxisMin: this.xAxisMin(),
      xAxisMax: this.xAxisMax(),
      xLogScale: this.xLogScale(),
      zoom: this.zoom(),
      showLegend: this.showLegend(),
      pointSize: this.pointSize(),
      // A band not yet pointed at a spec is left out — the server's Guid fields can't parse the
      // empty placeholder, and a half-built band shouldn't block autosave. It stays in the signal
      // so a mid-edit panel can still find it.
      toleranceBands: this.toleranceBands()
        .filter((b) => b.sourceDatasetId && b.sourceRowId && b.minColumnId && b.maxColumnId)
        .map((b) => ({ ...b })),
      tooltipColumns: this.tooltipColumns().map((c) => ({ ...c })),
    };
  }

  public abstract override toDto(): ChartWidget;

  public override childNodes(): readonly EditorNode[] {
    return this.bindings();
  }

  // Validates every binding, not just the first, so a half-configured overlaid dataset
  // (which ChartQuery.build would silently skip) still raises a warning.
  public override ownIssues(): ValidationIssue[] {
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

  // --- primary-binding accessors -------------------------------------------
  // Kept so the panel, validation, and schema-loading read the same shape they did when this
  // state lived directly on the widget. Removed once callers move to iterate `bindings`.

  public get datasetId(): WritableSignal<number | null> {
    return this.primaryBinding().datasetId;
  }
  public get xColumnId(): WritableSignal<string | null> {
    return this.primaryBinding().xColumnId;
  }
  public get yColumnId(): WritableSignal<string | null> {
    return this.primaryBinding().yColumnId;
  }
  public get seriesColumnId(): WritableSignal<string | null> {
    return this.primaryBinding().seriesColumnId;
  }
  public get filter(): FilterGroupModel {
    return this.primaryBinding().filter;
  }
  public get schema(): Signal<DatasetSchema | null> {
    return this.primaryBinding().schema;
  }
  public get numericColumns(): Signal<DatasetColumn[]> {
    return this.primaryBinding().numericColumns;
  }
  public get axisColumns(): Signal<DatasetColumn[]> {
    return this.primaryBinding().axisColumns;
  }

  /** The first binding — the one the delegating accessors above read through. */
  private primaryBinding(): ChartBindingModel {
    return this.bindings()[0];
  }
}
