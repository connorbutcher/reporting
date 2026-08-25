import { signal } from '@angular/core';
import {
  DEFAULT_BAR_CHART_CONFIG,
  DEFAULT_LINE_CHART_CONFIG,
  DEFAULT_SCATTER_CHART_CONFIG,
  DEFAULT_TABLE_CONFIG,
  DEFAULT_TEXT_CONFIG,
  Tab,
  Widget,
  WidgetType,
} from '../../../core/models/report';
import { clamp, rectsOverlap } from '../grid.util';
import { EditorNode } from './editor-node';
import { ModelSources, WidgetModel, widgetModelFromDto } from './widget.model';
import { ValidationIssue } from './validation-issue';

const MIN_GRID_SIZE = 1;
// Columns fill the canvas width, so a fine column count is normal now; rows can
// run long since the report scrolls vertically.
const MAX_GRID_SIZE = 200;

/**
 * The grid a brand-new (or unspecified) tab falls back to. Exported so the store
 * and the settings panel default to the same size the model does, instead of each
 * repeating the literals.
 */
export const DEFAULT_GRID_COLUMNS = 48;
export const DEFAULT_GRID_ROWS = 30;
// Sized for the default ~48-column grid: roughly a quarter width, a useful height.
const DEFAULT_WIDGET_W = 12;
const DEFAULT_WIDGET_H = 8;

/**
 * One tab of a report: its own grid and the widgets on it. Owns the grid geometry
 * and validates the things only it can see — whether widgets fit the grid and
 * whether any of them collide. Everything widget-specific is validated by the
 * widget itself; report-level concerns (filters, name) live on {@link ReportModel}.
 */
export class TabModel extends EditorNode {
  readonly id: string;
  readonly name = signal('');
  readonly order = signal(0);
  readonly gridColumns = signal(DEFAULT_GRID_COLUMNS);
  readonly gridRows = signal(DEFAULT_GRID_ROWS);
  readonly widgets = signal<readonly WidgetModel[]>([]);

  constructor(
    tab: Tab,
    private readonly sources: ModelSources,
  ) {
    super();
    this.id = tab.id;
    this.name.set(tab.name);
    this.order.set(tab.order);
    this.gridColumns.set(tab.columns);
    this.gridRows.set(tab.rows);
    this.widgets.set(tab.widgets.map((w) => widgetModelFromDto(w, sources)));
  }

  widget(widgetId: string): WidgetModel | null {
    return this.widgets().find((w) => w.id === widgetId) ?? null;
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

    const dto: Widget = this.emptyWidgetDto(type, base);

    const widget = widgetModelFromDto(dto, this.sources);
    this.widgets.update((widgets) => [...widgets, widget]);
    return widget;
  }

  /** A freshly-placed widget of the given type, filled with that type's default config. */
  private emptyWidgetDto(type: WidgetType, base: Omit<Widget, 'type' | 'config'>): Widget {
    switch (type) {
      case 'dataTable':
        return { ...base, type: 'dataTable', config: { type: 'dataTable', ...DEFAULT_TABLE_CONFIG } };
      case 'scatterChart':
        return {
          ...base,
          type: 'scatterChart',
          config: { type: 'scatterChart', ...DEFAULT_SCATTER_CHART_CONFIG },
        };
      case 'lineChart':
        return {
          ...base,
          type: 'lineChart',
          config: { type: 'lineChart', ...DEFAULT_LINE_CHART_CONFIG },
        };
      case 'barChart':
        return {
          ...base,
          type: 'barChart',
          config: { type: 'barChart', ...DEFAULT_BAR_CHART_CONFIG },
        };
      case 'staticText':
        return { ...base, type: 'staticText', config: { type: 'staticText', ...DEFAULT_TEXT_CONFIG } };
    }
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

  toDto(): Tab {
    return {
      id: this.id,
      name: this.name(),
      order: this.order(),
      columns: this.gridColumns(),
      rows: this.gridRows(),
      widgets: this.widgets().map((w) => w.toDto()),
    };
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return this.widgets();
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
