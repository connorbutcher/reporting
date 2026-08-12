import { Directive, DestroyRef, inject, input, output, signal } from '@angular/core';
import { CELL_SIZE, GridPreview, GridRect, clamp, rectsOverlap } from '../grid.util';
import { WidgetModel } from '../models/widget.model';
import { ReportBuilderStore } from '../report-builder.store';

export type ResizeDirection = 'right' | 'bottom' | 'corner';

/**
 * The resize half of a widget's pointer interaction, split out of the host so
 * the component keeps only widget dispatch and selection. Sits on the widget
 * surface and is started from a resize handle's `pointerdown`; the widget grows
 * or shrinks by whole grid cells, refusing sizes that would collide or leave
 * the grid.
 */
@Directive({
  selector: '[appWidgetResize]',
  exportAs: 'widgetResize',
})
export class WidgetResizeDirective {
  readonly widget = input.required<WidgetModel>({ alias: 'appWidgetResize' });

  /** Live preview of the widget's candidate rect, for the canvas overlay. */
  readonly gridPreview = output<GridPreview | null>();

  private readonly store = inject(ReportBuilderStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly invalid = signal(false);
  readonly previewSize = signal<{ width: number; height: number } | null>(null);

  private direction: ResizeDirection = 'corner';
  private startCell = { w: 0, h: 0 };
  private startPointer = { x: 0, y: 0 };
  private pending: GridRect | null = null;
  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanupListeners());
  }

  start(event: PointerEvent, direction: ResizeDirection): void {
    event.preventDefault();
    event.stopPropagation();

    const widget = this.widget();
    this.direction = direction;
    this.startCell = { w: widget.w(), h: widget.h() };
    this.startPointer = { x: event.clientX, y: event.clientY };
    this.previewSize.set({ width: widget.w() * CELL_SIZE, height: widget.h() * CELL_SIZE });

    this.moveListener = (e: PointerEvent) => this.onMove(e);
    this.upListener = () => this.onEnd();
    window.addEventListener('pointermove', this.moveListener);
    window.addEventListener('pointerup', this.upListener, { once: true });
  }

  private onMove(event: PointerEvent): void {
    const widget = this.widget();
    const dx = event.clientX - this.startPointer.x;
    const dy = event.clientY - this.startPointer.y;
    const deltaCols = Math.round(dx / CELL_SIZE);
    const deltaRows = Math.round(dy / CELL_SIZE);

    const candidateW =
      this.direction === 'bottom'
        ? widget.w()
        : clamp(this.startCell.w + deltaCols, 1, this.store.gridColumns() - widget.x());
    const candidateH =
      this.direction === 'right'
        ? widget.h()
        : clamp(this.startCell.h + deltaRows, 1, this.store.gridRows() - widget.y());
    const candidate: GridRect = { x: widget.x(), y: widget.y(), w: candidateW, h: candidateH };

    this.pending = candidate;
    const invalid = this.collides(candidate);
    this.invalid.set(invalid);
    this.previewSize.set({ width: candidateW * CELL_SIZE, height: candidateH * CELL_SIZE });
    this.gridPreview.emit({ ...candidate, invalid });
  }

  private onEnd(): void {
    this.cleanupListeners();
    if (this.pending && !this.collides(this.pending)) {
      this.widget().resizeTo(this.pending.w, this.pending.h);
    }
    this.pending = null;
    this.invalid.set(false);
    this.previewSize.set(null);
    this.gridPreview.emit(null);
  }

  private collides(candidate: GridRect): boolean {
    if (candidate.x < 0 || candidate.y < 0 || candidate.w < 1 || candidate.h < 1) return true;
    if (candidate.x + candidate.w > this.store.gridColumns()) return true;
    if (candidate.y + candidate.h > this.store.gridRows()) return true;

    const siblings = this.store.model()?.siblingsOf(this.widget().id) ?? [];
    return siblings.some((other) => rectsOverlap(candidate, other.rect()));
  }

  private cleanupListeners(): void {
    if (this.moveListener) {
      window.removeEventListener('pointermove', this.moveListener);
      this.moveListener = null;
    }
    if (this.upListener) {
      window.removeEventListener('pointerup', this.upListener);
      this.upListener = null;
    }
  }
}
