import { Injectable, inject } from '@angular/core';
import { WidgetType, WidgetFragment } from '../../../core/models/report';
import { UrlFragmentService } from '../../../core/services/url-fragment.service';
import { GridLayout } from '../grid/grid-layout';
import { WidgetModel } from '../models/widget.model';
import { PanelNavigation } from './panel-navigation';
import { ReportSession } from './report-session';
import { WidgetSelection } from './widget-selection';

/** Adds, removes, duplicates and moves widgets, keeping the selection and panel in sync. */
@Injectable()
export class WidgetCommands {
  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly navigation = inject(PanelNavigation);
  private readonly fragments = inject(UrlFragmentService);

  public addWidget(type: WidgetType): void {
    const widget = this.session.addWidget(type);
    if (!widget) {
      return;
    }
    this.selection.select(widget.id);
    this.navigation.navigate({ kind: 'widget', widgetId: widget.id });
    // Scroll the canvas to the new widget.
    this.fragments.navigate(WidgetFragment.forWidget(widget.id));
  }

  public removeWidget(widgetId: string): void {
    this.removeWidgets([widgetId]);
  }

  public removeWidgets(widgetIds: readonly string[]): void {
    if (widgetIds.length === 0) {
      return;
    }
    this.session.model()?.removeWidgets(widgetIds);

    this.selection.filterOut(widgetIds);
    if (this.selection.selectedWidgetIds().length === 0) {
      this.navigation.navigate({ kind: 'widgets' });
    }
  }

  /** Selects the copies. */
  public duplicateSelection(): void {
    const model = this.session.model();
    const ids = this.selection.selectedWidgetIds();
    if (!model || ids.length === 0) {
      return;
    }

    const copies = ids.map((id) => model.duplicateWidget(id)).filter((w): w is WidgetModel => !!w);
    if (copies.length === 0) {
      return;
    }

    this.selection.set(copies.map((w) => w.id));
    this.navigation.navigate({ kind: 'widget', widgetId: copies[copies.length - 1].id });
  }

  /** Refuses the move if any widget would collide. */
  public nudgeSelection(dx: number, dy: number): void {
    const widgets = this.session.selectedWidgets();
    if (widgets.length === 0) {
      return;
    }

    const moving = new Set(widgets.map((w) => w.id));
    const others = this.session.widgets().filter((w) => !moving.has(w.id));

    const targets = widgets.map((widget) => ({
      widget,
      rect: { x: widget.x() + dx, y: widget.y() + dy, w: widget.w(), h: widget.h() },
    }));

    if (
      !GridLayout.fitsWithoutCollision(
        targets,
        others,
        this.session.gridColumns(),
        this.session.gridRows(),
      )
    ) {
      return;
    }

    for (const { widget, rect } of targets) {
      widget.moveTo(rect.x, rect.y);
    }
  }

  /** Moves the panel `offset` widgets along, without adding history. */
  public stepWidget(offset: number): void {
    const widgets = this.session.widgets();
    const index = widgets.findIndex((w) => w.id === this.selection.selectedWidgetId());
    const next = widgets[index + offset];
    if (!next) {
      return;
    }
    this.navigation.replace({ kind: 'widget', widgetId: next.id });
  }
}
