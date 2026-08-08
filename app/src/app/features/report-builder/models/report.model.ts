import { Signal, computed, signal } from '@angular/core';
import {
  DEFAULT_CHART_CONFIG,
  DEFAULT_TABLE_CONFIG,
  DEFAULT_TEXT_CONFIG,
  ReportRevisionContent,
  Widget,
  WidgetType,
} from '../../../core/models/report.model';
import { FilterGroup, ReportFilter } from '../../../core/models/filter.model';
import { clamp, rectsOverlap } from '../grid.util';
import { EditorNode } from './editor-node';
import { ReportFilterModel } from './filter.model';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  ModelSources,
  WidgetModel,
  widgetModelFromDto,
} from './widget.model';
import { ValidationIssue } from './validation-issue';

const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 48;
const DEFAULT_WIDGET_W = 4;
const DEFAULT_WIDGET_H = 3;

/**
 * The report being edited. Owns the grid and the widgets on it, and validates
 * the things only it can see — whether widgets fit the grid and whether any of
 * them collide. Everything widget-specific is validated by the widget itself.
 */
export class ReportModel extends EditorNode {
  readonly reportId: string;
  readonly name = signal('');
  readonly gridColumns = signal(12);
  readonly gridRows = signal(10);
  readonly widgets = signal<readonly WidgetModel[]>([]);

  /** Report-level filters, one per dataset, layered over each widget's own. */
  readonly filters = signal<readonly ReportFilterModel[]>([]);

  /** Issues grouped by widget, so each one can show its own badge cheaply. */
  readonly issuesByWidget: Signal<Map<string, ValidationIssue[]>>;

  constructor(
    report: ReportRevisionContent,
    private readonly sources: ModelSources,
  ) {
    super();
    this.reportId = report.reportId;
    this.name.set(report.name);
    this.gridColumns.set(report.columns);
    this.gridRows.set(report.rows);
    this.widgets.set(report.widgets.map((w) => widgetModelFromDto(w, sources)));
    this.filters.set(
      (report.filters ?? []).map((f) => this.buildReportFilter(f.datasetId, f.filter)),
    );

    this.issuesByWidget = computed(() => {
      const map = new Map<string, ValidationIssue[]>();
      for (const issue of this.issues()) {
        if (!issue.widgetId) continue;
        const list = map.get(issue.widgetId);
        if (list) list.push(issue);
        else map.set(issue.widgetId, [issue]);
      }
      return map;
    });
  }

  static fromDto(report: ReportRevisionContent, sources: ModelSources): ReportModel {
    const model = new ReportModel(report, sources);
    // Freshly loaded state is by definition the saved state.
    model.markPristine();
    return model;
  }

  widget(widgetId: string): WidgetModel | null {
    return this.widgets().find((w) => w.id === widgetId) ?? null;
  }

  // --- report-level filters -------------------------------------------------

  /** Every dataset some table on this report is bound to, in first-use order. */
  readonly usedDatasetIds = computed(() => {
    const ids: string[] = [];
    for (const widget of this.widgets()) {
      if (!(widget instanceof DataTableWidgetModel) && !(widget instanceof ChartWidgetModel)) continue;
      const id = widget.datasetId();
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  });

  reportFilter(datasetId: string): ReportFilterModel | null {
    return this.filters().find((f) => f.datasetId === datasetId) ?? null;
  }

  /** The filter for a dataset, created on first use so the panel always has one to edit. */
  ensureReportFilter(datasetId: string): ReportFilterModel {
    const existing = this.reportFilter(datasetId);
    if (existing) return existing;

    const model = this.buildReportFilter(datasetId, null);
    this.filters.update((filters) => [...filters, model]);
    return model;
  }

  private buildReportFilter(datasetId: string, dto: FilterGroup | null): ReportFilterModel {
    return new ReportFilterModel(datasetId, dto, {
      schema: computed(() => this.sources.schemas()[datasetId] ?? null),
      catalogue: this.sources.catalogue,
      view: { kind: 'reportFilters' },
      ownerId: `report:${datasetId}`,
    });
  }

  setGridColumns(value: number): void {
    if (!Number.isFinite(value)) return;
    this.gridColumns.set(clamp(Math.round(value), MIN_GRID_SIZE, MAX_GRID_SIZE));
  }

  setGridRows(value: number): void {
    if (!Number.isFinite(value)) return;
    this.gridRows.set(clamp(Math.round(value), MIN_GRID_SIZE, MAX_GRID_SIZE));
  }

  /** Adds an empty widget in the first free space; the user configures it after. */
  addWidget(type: WidgetType): WidgetModel {
    const slot = this.findFreeSlot(DEFAULT_WIDGET_W, DEFAULT_WIDGET_H);
    this.growRowsFor(slot.y, DEFAULT_WIDGET_H);
    const base = { id: crypto.randomUUID(), ...slot, w: DEFAULT_WIDGET_W, h: DEFAULT_WIDGET_H };

    const dto: Widget =
      type === 'dataTable'
        ? { ...base, type: 'dataTable', config: { type: 'dataTable', ...DEFAULT_TABLE_CONFIG } }
        : type === 'chart'
          ? { ...base, type: 'chart', config: { type: 'chart', ...DEFAULT_CHART_CONFIG } }
          : { ...base, type: 'staticText', config: { type: 'staticText', ...DEFAULT_TEXT_CONFIG } };

    const widget = widgetModelFromDto(dto, this.sources);
    this.widgets.update((widgets) => [...widgets, widget]);
    return widget;
  }

  removeWidget(widgetId: string): void {
    this.widgets.update((widgets) => widgets.filter((w) => w.id !== widgetId));
  }

  removeWidgets(widgetIds: readonly string[]): void {
    const doomed = new Set(widgetIds);
    this.widgets.update((widgets) => widgets.filter((w) => !doomed.has(w.id)));
  }

  /** Copies a widget with all of its configuration into the nearest free space. */
  duplicateWidget(widgetId: string): WidgetModel | null {
    const source = this.widget(widgetId);
    if (!source) return null;

    const dto = source.toDto();
    // Must avoid every existing widget, the original included, or the copy
    // lands exactly on top of what it was copied from.
    const slot = this.findFreeSlot(dto.w, dto.h);
    this.growRowsFor(slot.y, dto.h);
    const copy = widgetModelFromDto({ ...dto, id: crypto.randomUUID(), ...slot }, this.sources);

    // Sits straight after the original so the list order matches the canvas.
    this.widgets.update((widgets) => {
      const index = widgets.findIndex((w) => w.id === widgetId);
      const next = [...widgets];
      next.splice(index + 1, 0, copy);
      return next;
    });
    return copy;
  }

  /**
   * Scans the grid row by row for somewhere the given size fits. Falls back to
   * directly below everything else, which validation will flag if the grid is
   * genuinely full rather than silently stacking widgets on top of each other.
   */
  findFreeSlot(w: number, h: number): { x: number; y: number } {
    const taken = this.widgets().map((widget) => widget.rect());

    for (let y = 0; y + h <= this.gridRows(); y++) {
      for (let x = 0; x + w <= this.gridColumns(); x++) {
        const candidate = { x, y, w, h };
        if (!taken.some((rect) => rectsOverlap(candidate, rect))) return { x, y };
      }
    }

    return { x: 0, y: taken.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0) };
  }

  /**
   * Extends the canvas so a widget placed at the fallback slot still fits.
   * Growing the grid is far friendlier than handing back a report that fails
   * validation and blocks saving because one click had nowhere to go.
   */
  private growRowsFor(y: number, h: number): void {
    if (y + h > this.gridRows()) this.setGridRows(y + h);
  }

  /** Widgets other than the given one, for collision checks while dragging. */
  siblingsOf(widgetId: string): readonly WidgetModel[] {
    return this.widgets().filter((w) => w.id !== widgetId);
  }

  toDto(): ReportRevisionContent {
    return {
      reportId: this.reportId,
      name: this.name(),
      columns: this.gridColumns(),
      rows: this.gridRows(),
      widgets: this.widgets().map((w) => w.toDto()),
      // Notes only ever exist on published versions; a draft's autosave payload never carries one.
      notes: null,
      filters: this.filters()
        .map((f) => f.toDto())
        .filter((f): f is ReportFilter => f !== null),
    };
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return [...this.widgets(), ...this.filters()];
  }

  protected override ownIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const widgets = this.widgets();
    const columns = this.gridColumns();
    const rows = this.gridRows();

    for (const widget of widgets) {
      const rect = widget.rect();
      if (rect.x + rect.w <= columns && rect.y + rect.h <= rows) continue;

      issues.push({
        id: `${widget.id}:bounds`,
        severity: 'error',
        title: `${widget.label()} sits outside the grid`,
        detail: `The grid is ${columns} × ${rows}; this widget reaches ${rect.x + rect.w} × ${rect.y + rect.h}.`,
        widgetId: widget.id,
        view: { kind: 'widget', widgetId: widget.id },
      });
    }

    // Overlaps are reported once per pair, against the later widget.
    widgets.forEach((widget, index) => {
      const overlapping = widgets
        .slice(0, index)
        .find((other) => rectsOverlap(widget.rect(), other.rect()));
      if (!overlapping) return;

      issues.push({
        id: `${widget.id}:overlap`,
        severity: 'error',
        title: `${widget.label()} overlaps ${overlapping.label()}`,
        detail: 'Move or resize one of them so they no longer sit on the same cells.',
        widgetId: widget.id,
        view: { kind: 'widget', widgetId: widget.id },
      });
    });

    return issues;
  }
}
