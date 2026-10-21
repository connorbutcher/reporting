import { Signal, computed, signal } from '@angular/core';
import { Widget, WidgetType } from '../../../core/models/report';
import { GridRect } from '../grid/grid-rect';
import { PanelView } from '../side-panel/panel-view';
import { EditorNode } from './editor-node';
import { IssueSeverity } from './issue-severity';
import { ValidationIssue } from './validation-issue';

export abstract class WidgetModel extends EditorNode {
  public readonly id: string;
  public readonly x = signal(0);
  public readonly y = signal(0);
  public readonly w = signal(1);
  public readonly h = signal(1);
  public readonly title = signal('');
  public readonly showTitle = signal(true);
  public abstract readonly type: WidgetType;

  /** The title shown, falling back to the widget kind. */
  public readonly label: Signal<string>;
  public readonly rect: Signal<GridRect>;

  constructor(widget: Widget) {
    super();
    this.id = widget.id;
    this.x.set(widget.x);
    this.y.set(widget.y);
    this.w.set(widget.w);
    this.h.set(widget.h);
    this.title.set(widget.config.title);
    this.showTitle.set(widget.config.showTitle);

    this.label = computed(() => this.title().trim() || this.defaultTitle());
    this.rect = computed(() => ({ x: this.x(), y: this.y(), w: this.w(), h: this.h() }));
  }

  public abstract defaultTitle(): string;

  public moveTo(x: number, y: number): void {
    this.x.set(Math.max(0, Math.round(x)));
    this.y.set(Math.max(0, Math.round(y)));
  }

  public resizeTo(w: number, h: number): void {
    this.w.set(Math.max(1, Math.round(w)));
    this.h.set(Math.max(1, Math.round(h)));
  }

  public abstract toDto(): Widget;

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public geometryDto() {
    return { id: this.id, x: this.x(), y: this.y(), w: this.w(), h: this.h() };
  }

  public baseConfigDto() {
    return { title: this.title(), showTitle: this.showTitle() };
  }

  /** An issue keyed under this widget; clicking it opens `view`, the widget's settings by default. */
  public issue(
    key: string,
    severity: IssueSeverity,
    title: string,
    detail: string,
    view: PanelView = { kind: 'widget', widgetId: this.id },
  ): ValidationIssue {
    return { id: `${this.id}:${key}`, severity, title, detail, widgetId: this.id, view };
  }
}
