import { Signal, WritableSignal, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  AxisLabelRotation,
  ChartGuideLine,
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
import { FilterGroupModel } from './filter';
import { ValidationIssue } from './validation-issue';
import { WidgetModel } from './widget-model-base';
import { ModelSources } from './sources/model-sources';

/**
 * Shared behaviour for every chart kind: series bindings, value axes, tolerance bands, guide lines,
 * tooltip columns and appearance. Subclasses add their presentation signals and build their DTO.
 * The editor still targets one binding, so the dataset/axis/filter accessors delegate to the first.
 */
export abstract class ChartWidgetModel extends WidgetModel {
  /** The datasets overlaid on this chart, in draw order; always at least one. */
  public readonly bindings = signal<readonly ChartBindingModel[]>([]);

  public readonly xAxisLabel = signal('');
  public readonly yAxisLabel = signal('');
  /** The value axes; the first is the primary. Always at least one. */
  public readonly yAxes = signal<readonly ChartValueAxis[]>([]);
  /** X-axis bounds (null auto-fits), scale and labels; `xAxisRotate` is null at the default. */
  public readonly xAxisMin = signal<number | null>(null);
  public readonly xAxisMax = signal<number | null>(null);
  public readonly xLogScale = signal(false);
  public readonly xAxisInterval = signal<number | null>(null);
  public readonly xAxisRotate = signal<AxisLabelRotation | null>(null);
  public readonly xAxisScale = signal(false);
  public readonly zoom = signal(true);
  public readonly zoomY = signal(false);
  public readonly showGridLines = signal(true);
  public readonly showValueLabels = signal(false);
  public readonly colorByValue = signal(false);
  /** Point charts only. */
  public readonly showTrendLine = signal(false);
  public readonly showLegend = signal(true);
  public readonly pointSize = signal(8);

  public readonly toleranceBands = signal<readonly ChartToleranceBand[]>([]);
  public readonly guideLines = signal<readonly ChartGuideLine[]>([]);
  public readonly tooltipColumns = signal<readonly ChartTooltipColumn[]>([]);

  /** Kept so bindings added later reuse the same look-ups. */
  private readonly sources: ModelSources;

  constructor(widget: ChartWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;
    this.sources = sources;

    this.xAxisLabel.set(config.xAxisLabel);
    this.yAxisLabel.set(config.yAxisLabel);
    // Folds an older single yAxisLabel into one primary axis.
    this.yAxes.set(readChartAxes(config));
    this.xAxisMin.set(config.xAxisMin ?? null);
    this.xAxisMax.set(config.xAxisMax ?? null);
    this.xLogScale.set(config.xLogScale ?? false);
    this.xAxisInterval.set(config.xAxisInterval ?? null);
    this.xAxisRotate.set(config.xAxisRotate ?? null);
    this.xAxisScale.set(config.xAxisScale ?? false);
    // Older charts saved before zoom existed default it on.
    this.zoom.set(config.zoom ?? true);
    this.zoomY.set(config.zoomY ?? false);
    this.showGridLines.set(config.showGridLines ?? true);
    this.showValueLabels.set(config.showValueLabels ?? false);
    this.colorByValue.set(config.colorByValue ?? false);
    this.showTrendLine.set(config.showTrendLine ?? false);
    this.showLegend.set(config.showLegend);
    this.pointSize.set(config.pointSize);
    this.toleranceBands.set(config.toleranceBands ?? []);
    this.guideLines.set(config.guideLines ?? []);
    this.tooltipColumns.set(config.tooltipColumns ?? []);

    // A fresh chart seeds one empty binding to bind.
    const seeded = config.bindings?.length
      ? config.bindings
      : [{ id: crypto.randomUUID(), ...EMPTY_CHART_BINDING }];
    this.bindings.set(
      seeded.map((b) => new ChartBindingModel(b, sources, this.id, this.toleranceBands)),
    );
  }

  /** Null when the binding isn't on this chart, e.g. just removed. */
  public binding(id: string): ChartBindingModel | null {
    return this.bindings().find((b) => b.id === id) ?? null;
  }

  /** Appends an unbound series and returns its id. */
  public addBinding(): string {
    const dto: ChartSeriesBinding = { id: crypto.randomUUID(), ...EMPTY_CHART_BINDING };
    const model = new ChartBindingModel(dto, this.sources, this.id, this.toleranceBands);
    this.bindings.update((bindings) => [...bindings, model]);
    return model.id;
  }

  /** The last binding stays, so a chart always has one. */
  public removeBinding(id: string): void {
    this.bindings.update((bindings) =>
      bindings.length <= 1 ? bindings : bindings.filter((b) => b.id !== id),
    );
  }

  /** Appends a value axis and returns its id. */
  public addYAxis(): string {
    const axis: ChartValueAxis = {
      id: crypto.randomUUID(),
      label: '',
      // A second axis goes on the right; further ones alternate sides.
      side: this.yAxes().length % 2 === 1 ? 'right' : 'left',
    };
    this.yAxes.update((axes) => [...axes, axis]);
    return axis.id;
  }

  /** The primary axis stays; bindings and bands on a removed axis fall back to it. */
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
    this.guideLines.update((lines) =>
      lines.map((l) => (l.yAxisId === id ? { ...l, yAxisId: null } : l)),
    );
  }

  public updateYAxis(id: string, patch: Partial<Omit<ChartValueAxis, 'id'>>): void {
    this.yAxes.update((axes) => axes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  public setDataset(datasetId: number | null): void {
    const primary = this.primaryBinding();
    if (datasetId === primary.datasetId()) return;
    primary.setDataset(datasetId);
    // Tooltip columns are chart-wide but keyed to the old schema.
    this.tooltipColumns.set([]);
  }

  public addToleranceBand(): string {
    const band: ChartToleranceBand = {
      id: crypto.randomUUID(),
      axis: 'y',
      // 0 and '' mean "no spec picked yet"; such a band is left out of the saved config.
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

  public addGuideLine(): string {
    const line: ChartGuideLine = {
      id: crypto.randomUUID(),
      axis: 'y',
      value: 0,
      label: '',
    };
    this.guideLines.update((lines) => [...lines, line]);
    return line.id;
  }

  public removeGuideLine(id: string): void {
    this.guideLines.update((lines) => lines.filter((l) => l.id !== id));
  }

  public updateGuideLine(id: string, patch: Partial<Omit<ChartGuideLine, 'id'>>): void {
    this.guideLines.update((lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  public guideLine(id: string): ChartGuideLine | null {
    return this.guideLines().find((l) => l.id === id) ?? null;
  }

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

  /** Drops the entry instead when the new column is already shown. */
  public replaceTooltipColumn(oldColumnId: string, newColumnId: string): void {
    if (oldColumnId === newColumnId) return;
    this.tooltipColumns.update((cols) =>
      cols
        .filter((c) => c.columnId !== newColumnId)
        .map((c) => (c.columnId === oldColumnId ? { ...c, columnId: newColumnId } : c)),
    );
  }

  /** The config fields common to every chart kind, for a subclass to spread into its DTO. */
  public chartConfigBaseDto(): Omit<ChartWidgetConfigBase, 'type'> {
    return {
      ...this.baseConfigDto(),
      bindings: this.bindings().map((b) => b.toDto()),
      yAxes: this.yAxes().map((a) => ({ ...a })),
      xAxisLabel: this.xAxisLabel(),
      // Mirrored onto the deprecated flat field for older readers.
      yAxisLabel: this.yAxes()[0]?.label ?? this.yAxisLabel(),
      xAxisMin: this.xAxisMin(),
      xAxisMax: this.xAxisMax(),
      xLogScale: this.xLogScale(),
      xAxisInterval: this.xAxisInterval(),
      xAxisRotate: this.xAxisRotate() ?? undefined,
      xAxisScale: this.xAxisScale(),
      zoom: this.zoom(),
      zoomY: this.zoomY(),
      showGridLines: this.showGridLines(),
      showValueLabels: this.showValueLabels(),
      colorByValue: this.colorByValue(),
      showTrendLine: this.showTrendLine(),
      showLegend: this.showLegend(),
      pointSize: this.pointSize(),
      // A band with no spec yet is left out: the server can't parse the empty ids, and it
      // shouldn't block autosave. It stays in the signal so the panel can still edit it.
      toleranceBands: this.toleranceBands()
        .filter((b) => b.sourceDatasetId && b.sourceRowId && b.minColumnId && b.maxColumnId)
        .map((b) => ({ ...b })),
      guideLines: this.guideLines().map((l) => ({ ...l })),
      tooltipColumns: this.tooltipColumns().map((c) => ({ ...c })),
    };
  }

  public abstract override toDto(): ChartWidget;

  public override childNodes(): readonly EditorNode[] {
    return this.bindings();
  }

  // Checks every binding, so a half-configured overlay (which the query skips) still warns.
  public override ownIssues(): ValidationIssue[] {
    const name = this.label();
    const bindings = this.bindings();
    const multi = bindings.length > 1;
    const issues: ValidationIssue[] = [...this.sharedChartIssues()];

    bindings.forEach((binding, i) => {
      const where = multi ? `${name} (dataset ${i + 1})` : name;
      if (!binding.datasetId()) {
        issues.push(
          this.issue(
            `noDataset:${binding.id}`,
            'warning',
            `${where} has no dataset`,
            'Pick a dataset so the chart has something to plot.',
          ),
        );
      } else if (!binding.xColumnId() || !binding.yColumnId()) {
        issues.push(
          this.issue(
            `noAxes:${binding.id}`,
            'warning',
            `${where} is missing an axis`,
            'Pick both an X and a Y column to plot.',
          ),
        );
      }
    });

    return issues;
  }

  /**
   * Checks that tooltip columns and tolerance-band columns still exist. Every subclass calls this
   * from its own `ownIssues()`, since none delegate to the base implementation.
   */
  public sharedChartIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const schema = this.schema();
    if (schema) {
      const columnIds = new Set(schema.columns.map((c) => c.id));
      if (this.tooltipColumns().some((c) => !columnIds.has(c.columnId))) {
        issues.push(
          this.issue(
            'tooltipMissingColumn',
            'error',
            `${this.label()} shows a tooltip column that no longer exists`,
            'One of the extra tooltip columns was removed from the dataset. Remove or replace it.',
          ),
        );
      }
    }

    // A band reads its own limits dataset, so it's checked against that schema.
    for (const band of this.toleranceBands()) {
      const bandSchema = band.sourceDatasetId
        ? (this.sources.schemas()[band.sourceDatasetId] ?? null)
        : null;
      if (!bandSchema) continue;

      const columnIds = new Set(bandSchema.columns.map((c) => c.id));
      const pointers = [
        band.minColumnId,
        band.maxColumnId,
        band.concessionLowerColumnId,
        band.concessionUpperColumnId,
      ].filter((id): id is string => !!id);

      if (pointers.some((id) => !columnIds.has(id))) {
        issues.push(
          this.issue(
            `tolerance:${band.id}:missingColumn`,
            'error',
            `${this.label()}'s tolerance band points at a removed column`,
            `"${bandSchema.name}" no longer has one of the columns this band uses. Re-point it or remove the band.`,
            { kind: 'chartToleranceBand', widgetId: this.id, bandId: band.id },
          ),
        );
      }
    }

    return issues;
  }

  // Primary-binding accessors, kept until callers iterate `bindings` directly.

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

  private primaryBinding(): ChartBindingModel {
    return this.bindings()[0];
  }
}
