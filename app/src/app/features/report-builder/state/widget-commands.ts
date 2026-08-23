import { Signal } from '@angular/core';
import { WidgetType } from '../../../core/models/report';
import { fitsWithoutCollision } from '../grid.util';
import { ReportModel } from '../models/report.model';
import { WidgetModel } from '../models/widget.model';
import { PanelView } from '../side-panel/panel-view';
import { WidgetSelection } from './widget-selection';

/**
 * The verbs that add, remove, duplicate and move widgets — each one a small
 * dance across the model tree, the selection, and the panel. Kept together so
 * the store stays a read-model, and given the panel's `navigate` / `replace`
 * (rather than the raw navigation) so selection stays in sync, exactly as when
 * the user drives it.
 */
export class WidgetCommands {
  constructor(
    private readonly model: Signal<ReportModel | null>,
    private readonly selection: WidgetSelection,
    private readonly selectedWidgets: Signal<readonly WidgetModel[]>,
    private readonly navigate: (view: PanelView) => void,
    private readonly replace: (view: PanelView) => void,
  ) {}

  addWidget(type: WidgetType): void {
    const widget = this.model()?.addWidget(type);
    if (!widget) return;
    this.selection.select(widget.id);
    this.navigate({ kind: 'widget', widgetId: widget.id });
  }

  removeWidget(widgetId: string): void {
    this.removeWidgets([widgetId]);
  }

  /** Removes every given widget, then drops them from the selection. */
  removeWidgets(widgetIds: readonly string[]): void {
    if (widgetIds.length === 0) return;
    this.model()?.removeWidgets(widgetIds);

    this.selection.filterOut(widgetIds);
    if (this.selection.selectedWidgetIds().length === 0) this.navigate({ kind: 'widgets' });
  }

  /** Copies the current selection, and selects the copies. */
  duplicateSelection(): void {
    const model = this.model();
    const ids = this.selection.selectedWidgetIds();
    if (!model || ids.length === 0) return;

    const copies = ids.map((id) => model.duplicateWidget(id)).filter((w): w is WidgetModel => !!w);
    if (copies.length === 0) return;

    this.selection.set(copies.map((w) => w.id));
    this.navigate({ kind: 'widget', widgetId: copies[copies.length - 1].id });
  }

  /** Nudges every selected widget, refusing the move if any would collide. */
  nudgeSelection(dx: number, dy: number): void {
    const model = this.model();
    const widgets = this.selectedWidgets();
    if (!model || widgets.length === 0) return;

    const moving = new Set(widgets.map((w) => w.id));
    const others = model.widgets().filter((w) => !moving.has(w.id));

    const targets = widgets.map((widget) => ({
      widget,
      rect: { x: widget.x() + dx, y: widget.y() + dy, w: widget.w(), h: widget.h() },
    }));

    if (!fitsWithoutCollision(targets, others, model.gridColumns(), model.gridRows())) return;

    for (const { widget, rect } of targets) widget.moveTo(rect.x, rect.y);
  }

  /** Moves the panel to the widget `offset` places along, without adding history. */
  stepWidget(offset: number): void {
    const widgets = this.model()?.widgets() ?? [];
    const index = widgets.findIndex((w) => w.id === this.selection.selectedWidgetId());
    const next = widgets[index + offset];
    if (!next) return;
    this.replace({ kind: 'widget', widgetId: next.id });
  }
}
