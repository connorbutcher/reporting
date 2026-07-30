import { CdkDrag, CdkDragEnd, CdkDragHandle, CdkDragMove } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { Widget } from '../../../core/models/report.model';
import { CELL_SIZE, GRID_COLUMNS, clamp, rectsOverlap } from '../grid.util';
import { DataTableWidgetComponent } from '../widgets/data-table-widget/data-table-widget.component';

@Component({
  selector: 'app-widget-host',
  imports: [CdkDrag, CdkDragHandle, DataTableWidgetComponent],
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
  readonly widgetChange = output<Widget>();

  private readonly destroyRef = inject(DestroyRef);

  protected readonly gridColumn = computed(() => `${this.widget().x + 1} / span ${this.widget().w}`);
  protected readonly gridRow = computed(() => `${this.widget().y + 1} / span ${this.widget().h}`);
  protected readonly title = computed(() => (this.widget().type === 'dataTable' ? 'Data Table' : this.widget().type));

  protected readonly dragInvalid = signal(false);
  protected readonly resizeInvalid = signal(false);
  protected readonly resizePreviewSize = signal<{ width: number; height: number } | null>(null);

  private dragStartCell = { x: 0, y: 0 };
  private pendingDrag: Widget | null = null;

  private resizeStartCell = { w: 0, h: 0 };
  private resizeStartPointer = { x: 0, y: 0 };
  private pendingResize: Widget | null = null;
  private resizeMoveListener: ((e: PointerEvent) => void) | null = null;
  private resizeUpListener: ((e: PointerEvent) => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanupResizeListeners());
  }

  protected onDragStarted(): void {
    const w = this.widget();
    this.dragStartCell = { x: w.x, y: w.y };
  }

  protected onDragMoved(event: CdkDragMove): void {
    const w = this.widget();
    const deltaCols = Math.round(event.distance.x / CELL_SIZE);
    const deltaRows = Math.round(event.distance.y / CELL_SIZE);
    const candidate: Widget = {
      ...w,
      x: clamp(this.dragStartCell.x + deltaCols, 0, GRID_COLUMNS - w.w),
      y: Math.max(0, this.dragStartCell.y + deltaRows),
    };
    this.pendingDrag = candidate;
    this.dragInvalid.set(this.collides(candidate));
  }

  protected onDragEnded(event: CdkDragEnd): void {
    if (this.pendingDrag && !this.collides(this.pendingDrag)) {
      this.widgetChange.emit(this.pendingDrag);
    }
    this.pendingDrag = null;
    this.dragInvalid.set(false);
    event.source.reset();
  }

  protected onResizeStart(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const w = this.widget();
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
    const candidateW = clamp(this.resizeStartCell.w + deltaCols, 1, GRID_COLUMNS - w.x);
    const candidateH = Math.max(1, this.resizeStartCell.h + deltaRows);
    const candidate: Widget = { ...w, w: candidateW, h: candidateH };

    this.pendingResize = candidate;
    this.resizeInvalid.set(this.collides(candidate));
    this.resizePreviewSize.set({ width: candidateW * CELL_SIZE, height: candidateH * CELL_SIZE });
  }

  private onResizeEnd(): void {
    this.cleanupResizeListeners();
    if (this.pendingResize && !this.collides(this.pendingResize)) {
      this.widgetChange.emit(this.pendingResize);
    }
    this.pendingResize = null;
    this.resizeInvalid.set(false);
    this.resizePreviewSize.set(null);
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
    if (candidate.x + candidate.w > GRID_COLUMNS) return true;
    return this.otherWidgets().some((other) => rectsOverlap(candidate, other));
  }
}
