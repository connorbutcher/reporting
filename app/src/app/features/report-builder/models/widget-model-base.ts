import { Signal, computed, signal } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset.model';
import { Widget, WidgetType } from '../../../core/models/report.model';
import { OperatorCatalogue } from '../../../core/models/filter.model';
import { GridRect } from '../grid.util';
import { EditorNode } from './editor-node';

/** Look-up of dataset schemas by dataset id, supplied by the store's cache. */
export type SchemaSource = Signal<Record<number, DatasetSchema>>;

/** Filter operators per column type, supplied by the store once fetched. */
export type CatalogueSource = Signal<OperatorCatalogue | null>;

/** The shared look-ups every model node needs to describe and validate itself. */
export interface ModelSources {
  readonly schemas: SchemaSource;
  readonly catalogue: CatalogueSource;
}

/** Shared behaviour for anything that can sit on the report grid. */
export abstract class WidgetModel extends EditorNode {
  readonly id: string;
  readonly x = signal(0);
  readonly y = signal(0);
  readonly w = signal(1);
  readonly h = signal(1);
  readonly title = signal('');
  readonly showTitle = signal(true);

  abstract readonly type: WidgetType;

  /** Title actually shown, falling back to the widget kind. */
  readonly label: Signal<string>;

  /** Current footprint on the grid, for collision and bounds checks. */
  readonly rect: Signal<GridRect>;

  protected constructor(widget: Widget) {
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

  protected abstract defaultTitle(): string;

  moveTo(x: number, y: number): void {
    this.x.set(Math.max(0, Math.round(x)));
    this.y.set(Math.max(0, Math.round(y)));
  }

  resizeTo(w: number, h: number): void {
    this.w.set(Math.max(1, Math.round(w)));
    this.h.set(Math.max(1, Math.round(h)));
  }

  abstract toDto(): Widget;

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  /** Geometry common to both widget kinds. */
  protected geometryDto() {
    return { id: this.id, x: this.x(), y: this.y(), w: this.w(), h: this.h() };
  }

  protected baseConfigDto() {
    return { title: this.title(), showTitle: this.showTitle() };
  }
}
