import { signal } from '@angular/core';
import {
  DEFAULT_BAR_CHART_CONFIG,
  DEFAULT_COMBO_CHART_CONFIG,
  DEFAULT_BOX_PLOT_CONFIG,
  DEFAULT_HISTOGRAM_CONFIG,
  DEFAULT_KPI_CONFIG,
  DEFAULT_PIVOT_CONFIG,
  DEFAULT_LINE_CHART_CONFIG,
  DEFAULT_SCATTER_CHART_CONFIG,
  DEFAULT_TABLE_CONFIG,
  DEFAULT_TEXT_CONFIG,
  DEFAULT_XBAR_R_CHART_CONFIG,
  Tab,
  Widget,
  WidgetType,
} from '../../../core/models/report';
import { GridLayout } from '../grid/grid-layout';
import { EditorNode } from './editor-node';
import { WidgetModel } from './widget.model';
import { WidgetModelFactory } from './widget-model-factory';
import { ValidationIssue } from './validation-issue';
import { ModelSources } from './sources/model-sources';

/**
 * One tab of a report: its grid and widgets. Validates what only it can see, whether widgets fit
 * the grid and whether any collide; each widget validates itself.
 */
export class TabModel extends EditorNode {
  /** The grid size a new tab starts with. */
  public static readonly DEFAULT_GRID_COLUMNS = 48;
  public static readonly DEFAULT_GRID_ROWS = 30;

  private static readonly MIN_GRID_SIZE = 1;

  // Columns fill the canvas width and the report scrolls vertically, so both can be large.
  private static readonly MAX_GRID_SIZE = 200;

  // Roughly a quarter of the default 48-column grid.
  private static readonly DEFAULT_WIDGET_W = 12;
  private static readonly DEFAULT_WIDGET_H = 8;

  public readonly id: string;
  public readonly name = signal('');
  public readonly order = signal(0);
  public readonly gridColumns = signal(TabModel.DEFAULT_GRID_COLUMNS);
  public readonly gridRows = signal(TabModel.DEFAULT_GRID_ROWS);
  public readonly widgets = signal<readonly WidgetModel[]>([]);

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
    this.widgets.set(tab.widgets.map((w) => WidgetModelFactory.fromDto(w, sources)));
  }

  public widget(widgetId: string): WidgetModel | null {
    return this.widgets().find((w) => w.id === widgetId) ?? null;
  }

  public setGridColumns(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this.gridColumns.set(
      GridLayout.clamp(Math.round(value), TabModel.MIN_GRID_SIZE, TabModel.MAX_GRID_SIZE),
    );
  }

  public setGridRows(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this.gridRows.set(
      GridLayout.clamp(Math.round(value), TabModel.MIN_GRID_SIZE, TabModel.MAX_GRID_SIZE),
    );
  }

  /** Adds an empty widget in the first free space. */
  public addWidget(type: WidgetType): WidgetModel {
    const slot = this.findFreeSlot(TabModel.DEFAULT_WIDGET_W, TabModel.DEFAULT_WIDGET_H);
    this.growRowsFor(slot.y, TabModel.DEFAULT_WIDGET_H);
    const base = {
      id: crypto.randomUUID(),
      ...slot,
      w: TabModel.DEFAULT_WIDGET_W,
      h: TabModel.DEFAULT_WIDGET_H,
    };

    const dto: Widget = this.emptyWidgetDto(type, base);

    const widget = WidgetModelFactory.fromDto(dto, this.sources);
    this.widgets.update((widgets) => [...widgets, widget]);
    return widget;
  }

  public removeWidget(widgetId: string): void {
    this.widgets.update((widgets) => widgets.filter((w) => w.id !== widgetId));
  }

  public removeWidgets(widgetIds: readonly string[]): void {
    const doomed = new Set(widgetIds);
    this.widgets.update((widgets) => widgets.filter((w) => !doomed.has(w.id)));
  }

  /** Copies a widget and its configuration into the nearest free space. */
  public duplicateWidget(widgetId: string): WidgetModel | null {
    const source = this.widget(widgetId);
    if (!source) {
      return null;
    }

    const dto = source.toDto();
    // Avoid every widget, the original included, or the copy lands on top of it.
    const slot = this.findFreeSlot(dto.w, dto.h);
    this.growRowsFor(slot.y, dto.h);
    const copy = WidgetModelFactory.fromDto(
      { ...dto, id: crypto.randomUUID(), ...slot },
      this.sources,
    );

    // Insert after the original so list order matches the canvas.
    this.widgets.update((widgets) => {
      const index = widgets.findIndex((w) => w.id === widgetId);
      const next = [...widgets];
      next.splice(index + 1, 0, copy);
      return next;
    });
    return copy;
  }

  /**
   * The first spot, row by row, where the size fits. Falls back to below everything else, which
   * validation flags if the grid is genuinely full.
   */
  public findFreeSlot(w: number, h: number): { x: number; y: number } {
    const taken = this.widgets().map((widget) => widget.rect());

    for (let y = 0; y + h <= this.gridRows(); y++) {
      for (let x = 0; x + w <= this.gridColumns(); x++) {
        const candidate = { x, y, w, h };
        if (!taken.some((rect) => GridLayout.rectsOverlap(candidate, rect))) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: taken.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0) };
  }

  public siblingsOf(widgetId: string): readonly WidgetModel[] {
    return this.widgets().filter((w) => w.id !== widgetId);
  }

  public toDto(): Tab {
    return {
      id: this.id,
      name: this.name(),
      order: this.order(),
      columns: this.gridColumns(),
      rows: this.gridRows(),
      widgets: this.widgets().map((w) => w.toDto()),
    };
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return this.widgets();
  }

  public override ownIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const widgets = this.widgets();
    const columns = this.gridColumns();
    const rows = this.gridRows();

    for (const widget of widgets) {
      const rect = widget.rect();
      if (rect.x + rect.w <= columns && rect.y + rect.h <= rows) {
        continue;
      }

      issues.push({
        id: `${widget.id}:bounds`,
        severity: 'error',
        title: `${widget.label()} sits outside the grid`,
        detail: `The grid is ${columns} × ${rows}; this widget reaches ${rect.x + rect.w} × ${rect.y + rect.h}.`,
        widgetId: widget.id,
        view: { kind: 'widget', widgetId: widget.id },
      });
    }

    // Each overlapping pair is reported once, against the later widget.
    widgets.forEach((widget, index) => {
      const overlapping = widgets
        .slice(0, index)
        .find((other) => GridLayout.rectsOverlap(widget.rect(), other.rect()));
      if (!overlapping) {
        return;
      }

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

  private emptyWidgetDto(type: WidgetType, base: Omit<Widget, 'type' | 'config'>): Widget {
    switch (type) {
      case 'dataTable':
        return {
          ...base,
          type: 'dataTable',
          config: { type: 'dataTable', ...DEFAULT_TABLE_CONFIG },
        };
      case 'pivotTable':
        return {
          ...base,
          type: 'pivotTable',
          config: { type: 'pivotTable', ...DEFAULT_PIVOT_CONFIG },
        };
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
      case 'comboChart':
        return {
          ...base,
          type: 'comboChart',
          config: { type: 'comboChart', ...DEFAULT_COMBO_CHART_CONFIG },
        };
      case 'boxPlot':
        return {
          ...base,
          type: 'boxPlot',
          config: { type: 'boxPlot', ...DEFAULT_BOX_PLOT_CONFIG },
        };
      case 'histogram':
        return {
          ...base,
          type: 'histogram',
          config: { type: 'histogram', ...DEFAULT_HISTOGRAM_CONFIG },
        };
      case 'xbarRChart':
        return {
          ...base,
          type: 'xbarRChart',
          config: { type: 'xbarRChart', ...DEFAULT_XBAR_R_CHART_CONFIG },
        };
      case 'staticText':
        return {
          ...base,
          type: 'staticText',
          config: { type: 'staticText', ...DEFAULT_TEXT_CONFIG },
        };
      case 'kpi':
        return { ...base, type: 'kpi', config: { type: 'kpi', ...DEFAULT_KPI_CONFIG } };
    }
  }

  /** Grows the grid so a widget at the fallback slot fits, rather than failing validation. */
  private growRowsFor(y: number, h: number): void {
    if (y + h > this.gridRows()) {
      this.setGridRows(y + h);
    }
  }
}
