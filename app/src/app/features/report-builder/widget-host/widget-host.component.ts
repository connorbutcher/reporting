import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { Widget } from '../../../core/models/report.model';
import { CELL_SIZE, GridPreview, clamp, rectsOverlap } from '../grid.util';
import { DataTableWidgetComponent } from '../widgets/data-table-widget/data-table-widget.component';

type ResizeDirection = 'right' | 'bottom' | 'corner';

@Component({
  selector: 'app-widget-host',
  imports: [DataTableWidgetComponent],
  templateUrl: './widget-host.component.html',
  styleUrl: './widget-host.component.scss',
  host: {
    class: 'widget-host',
    '[style.grid-column]': 'gridColumn()',
    '[style.grid-row]': 'gridRow()',
  },
})
export class WidgetHostComponent {
  readonly widget = input.required<Widget>();
  readonly otherWidgets = input.required<Widget[]>();
  readonly columns = input.required<number>();
  readonly rows = input.required<number>();
  readonly widgetChange = output<Widget>();
  readonly gridPreview = output<GridPreview | null>();

  private readonly destroyRef = inject(DestroyRef);

  protected readonly gridColumn = computed(() => `${this.widget().x + 1} / span ${this.widget().w}`);
  protected readonly gridRow = computed(() => `${this.widget().y + 1} / span ${this.widget().h}`);
  protected readonly title = computed(() => (this.widget().type === 'dataTable' ? 'Data Table' : this.widget().type));

  protected readonly dragging = signal(false);
  protected readonly dragOffset = signal<{ x: number; y: number } | null>(null);
  protected readonly dragTransform = computed(() => {
    const offset = this.dragOffset();
    return offset ? `translate(${offset.x}px, ${offset.y}px)` : null;
  });
  protected readonly dragInvalid = signal(false);
  protected readonly resizeInvalid = signal(false);
  protected readonly resizePreviewSize = signal<{ width: number; height: number } | null>(null);

  private dragStartCell = { x: 0, y: 0 };
  private dragStartPointer = { x: 0, y: 0 };
  private pendingDrag: Widget | null = null;
  private dragMoveListener: ((e: PointerEvent) => void) | null = null;
  private dragUpListener: ((e: PointerEvent) => void) | null = null;

  private resizeDirection: ResizeDirection = 'corner';
  private resizeStartCell = { w: 0, h: 0 };
  private resizeStartPointer = { x: 0, y: 0 };
  private pendingResize: Widget | null = null;
  private resizeMoveListener: ((e: PointerEvent) => void) | null = null;
  private resizeUpListener: ((e: PointerEvent) => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cleanupDragListeners();
      this.cleanupResizeListeners();
    });
  }

  protected onDragStart(event: PointerEvent): void {
    event.preventDefault();

    const w = this.widget();
    this.dragStartCell = { x: w.x, y: w.y };
    this.dragStartPointer = { x: event.clientX, y: event.clientY };
    this.dragOffset.set({ x: 0, y: 0 });
    this.dragging.set(true);

    this.dragMoveListener = (e: PointerEvent) => this.onDragMove(e);
    this.dragUpListener = () => this.onDragEnd();
    window.addEventListener('pointermove', this.dragMoveListener);
    window.addEventListener('pointerup', this.dragUpListener, { once: true });
  }

  private onDragMove(event: PointerEvent): void {
    const w = this.widget();
    const dx = event.clientX - this.dragStartPointer.x;
    const dy = event.clientY - this.dragStartPointer.y;
    this.dragOffset.set({ x: dx, y: dy });

    const deltaCols = Math.round(dx / CELL_SIZE);
    const deltaRows = Math.round(dy / CELL_SIZE);
    const candidate: Widget = {
      ...w,
      x: clamp(this.dragStartCell.x + deltaCols, 0, this.columns() - w.w),
      y: clamp(this.dragStartCell.y + deltaRows, 0, this.rows() - w.h),
    };
    this.pendingDrag = candidate;
    const invalid = this.collides(candidate);
    this.dragInvalid.set(invalid);
    this.gridPreview.emit({ x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h, invalid });
  }

  private onDragEnd(): void {
    this.cleanupDragListeners();
    if (this.pendingDrag && !this.collides(this.pendingDrag)) {
      this.widgetChange.emit(this.pendingDrag);
    }
    this.pendingDrag = null;
    this.dragInvalid.set(false);
    this.dragging.set(false);
    this.dragOffset.set(null);
    this.gridPreview.emit(null);
  }

  private cleanupDragListeners(): void {
    if (this.dragMoveListener) {
      window.removeEventListener('pointermove', this.dragMoveListener);
      this.dragMoveListener = null;
    }
    if (this.dragUpListener) {
      window.removeEventListener('pointerup', this.dragUpListener);
      this.dragUpListener = null;
    }
  }

  protected onResizeStart(event: PointerEvent, direction: ResizeDirection): void {
    event.preventDefault();
    event.stopPropagation();

    const w = this.widget();
    this.resizeDirection = direction;
    this.resizeStartCell = { w: w.w, h: w.h };
    this.resizeStartPointer = { x: event.clientX, y: event.clientY };
    this.resizePreviewSize.set({ width: w.w * CELL_SIZE, height: w.h * CELL_SIZE });

    this.resizeMoveListener = (e: PointerEvent) => this.onResizeMove(e);
    this.resizeUpListener = () => this.onResizeEnd();
    window.addEventListener('pointermove', this.resizeMoveListener);
    window.addEventListener('pointerup', this.resizeUpListener, { once: true });
  }

  private onResizeMove(event: PointerEvent): void {
    const w = this.widget();
    const dx = event.clientX - this.resizeStartPointer.x;
    const dy = event.clientY - this.resizeStartPointer.y;
    const deltaCols = Math.round(dx / CELL_SIZE);
    const deltaRows = Math.round(dy / CELL_SIZE);

    const candidateW =
      this.resizeDirection === 'bottom' ? w.w : clamp(this.resizeStartCell.w + deltaCols, 1, this.columns() - w.x);
    const candidateH =
      this.resizeDirection === 'right' ? w.h : clamp(this.resizeStartCell.h + deltaRows, 1, this.rows() - w.y);
    const candidate: Widget = { ...w, w: candidateW, h: candidateH };

    this.pendingResize = candidate;
    const invalid = this.collides(candidate);
    this.resizeInvalid.set(invalid);
    this.resizePreviewSize.set({ width: candidateW * CELL_SIZE, height: candidateH * CELL_SIZE });
    this.gridPreview.emit({ x: w.x, y: w.y, w: candidateW, h: candidateH, invalid });
  }

  private onResizeEnd(): void {
    this.cleanupResizeListeners();
    if (this.pendingResize && !this.collides(this.pendingResize)) {
      this.widgetChange.emit(this.pendingResize);
    }
    this.pendingResize = null;
    this.resizeInvalid.set(false);
    this.resizePreviewSize.set(null);
    this.gridPreview.emit(null);
  }

  private cleanupResizeListeners(): void {
    if (this.resizeMoveListener) {
      window.removeEventListener('pointermove', this.resizeMoveListener);
      this.resizeMoveListener = null;
    }
    if (this.resizeUpListener) {
      window.removeEventListener('pointerup', this.resizeUpListener);
      this.resizeUpListener = null;
    }
  }

  private collides(candidate: Widget): boolean {
    if (candidate.x < 0 || candidate.y < 0 || candidate.w < 1 || candidate.h < 1) return true;
    if (candidate.x + candidate.w > this.columns()) return true;
    if (candidate.y + candidate.h > this.rows()) return true;
    return this.otherWidgets().some((other) => rectsOverlap(candidate, other));
  }
}
