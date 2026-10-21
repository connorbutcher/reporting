import { Directive, DestroyRef, inject, input, output, signal } from '@angular/core';
import { GridLayout } from '../grid/grid-layout';
import { GridPreview } from '../grid/grid-preview';
import { GridRect } from '../grid/grid-rect';
import { WidgetModel } from '../models/widget.model';
import { ReportSession } from '../state/report-session';
import { ResizeDirection } from './resize-direction';

/** Resizes a widget from a handle by whole cells, refusing sizes that collide or leave the grid. */
@Directive({
  selector: '[appWidgetResize]',
  exportAs: 'widgetResize',
})
export class WidgetResizeDirective {
  readonly widget = input.required<WidgetModel>({ alias: 'appWidgetResize' });

  /** The candidate rect, for the canvas overlay. */
  readonly gridPreview = output<GridPreview | null>();

  private readonly session = inject(ReportSession);
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
    this.previewSize.set(this.pixelSize(widget.w(), widget.h()));

    this.moveListener = (e: PointerEvent) => this.onMove(e);
    this.upListener = () => this.onEnd();
    window.addEventListener('pointermove', this.moveListener);
    window.addEventListener('pointerup', this.upListener, { once: true });
  }

  private onMove(event: PointerEvent): void {
    const widget = this.widget();
    const dx = event.clientX - this.startPointer.x;
    const dy = event.clientY - this.startPointer.y;
    const columnStep = this.session.columnWidth() + GridLayout.GRID_GAP;
    const deltaCols = columnStep > GridLayout.GRID_GAP ? Math.round(dx / columnStep) : 0;
    const deltaRows = Math.round(dy / (GridLayout.ROW_HEIGHT + GridLayout.GRID_GAP));

    const candidateW =
      this.direction === 'bottom'
        ? widget.w()
        : GridLayout.clamp(
            this.startCell.w + deltaCols,
            1,
            this.session.gridColumns() - widget.x(),
          );
    const candidateH =
      this.direction === 'right'
        ? widget.h()
        : GridLayout.clamp(this.startCell.h + deltaRows, 1, this.session.gridRows() - widget.y());
    const candidate: GridRect = { x: widget.x(), y: widget.y(), w: candidateW, h: candidateH };

    this.pending = candidate;
    const invalid = this.collides(candidate);
    this.invalid.set(invalid);
    this.previewSize.set(this.pixelSize(candidateW, candidateH));
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

  /** Cells plus the gaps between them. */
  private pixelSize(w: number, h: number): { width: number; height: number } {
    const columnStep = this.session.columnWidth() + GridLayout.GRID_GAP;
    return {
      width: Math.max(0, w * columnStep - GridLayout.GRID_GAP),
      height: h * (GridLayout.ROW_HEIGHT + GridLayout.GRID_GAP) - GridLayout.GRID_GAP,
    };
  }

  private collides(candidate: GridRect): boolean {
    if (candidate.x < 0 || candidate.y < 0 || candidate.w < 1 || candidate.h < 1) return true;
    if (candidate.x + candidate.w > this.session.gridColumns()) return true;
    if (candidate.y + candidate.h > this.session.gridRows()) return true;

    const siblings = this.session.model()?.siblingsOf(this.widget().id) ?? [];
    return siblings.some((other) => GridLayout.rectsOverlap(candidate, other.rect()));
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
