import { Directive, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { GRID_GAP, ROW_HEIGHT, GridPreview, GridRect, clamp, rectsOverlap } from '../grid.util';
import { WidgetModel } from '../models/widget.model';
import { ReportSession } from '../state/report-session';

/**
 * The drag half of a widget's pointer interaction, split out of the host so the
 * component keeps only widget dispatch and selection. Sits on the widget surface
 * and is started from the header's `pointerdown`; the whole current selection
 * moves as a group, snapping to the grid and refusing moves that would collide.
 */
@Directive({
  selector: '[appWidgetDrag]',
  exportAs: 'widgetDrag',
})
export class WidgetDragDirective {
  readonly widget = input.required<WidgetModel>({ alias: 'appWidgetDrag' });

  /** Live preview of where the dragged widget would land, for the canvas overlay. */
  readonly gridPreview = output<GridPreview | null>();
  /** Fires synchronously before the drag begins so the host can update the selection. */
  readonly selectRequest = output<PointerEvent>();

  private readonly session = inject(ReportSession);
  private readonly destroyRef = inject(DestroyRef);

  readonly dragging = signal(false);
  private readonly dragOffset = signal<{ x: number; y: number } | null>(null);
  readonly transform = computed(() => {
    const offset = this.dragOffset();
    return offset ? `translate(${offset.x}px, ${offset.y}px)` : null;
  });
  readonly invalid = signal(false);

  private dragStartPointer = { x: 0, y: 0 };
  /** Every widget moving in this drag, with where it started. */
  private dragGroup: { widget: WidgetModel; origin: { x: number; y: number } }[] = [];
  /** The accepted offset for the group, or null while it would collide. */
  private pendingDelta: { dx: number; dy: number } | null = null;
  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanupListeners());
  }

  start(event: PointerEvent): void {
    event.preventDefault();
    // The surface below also selects on pointerdown; letting this bubble would
    // run the toggle twice and cancel out a ctrl-click.
    event.stopPropagation();
    // Emitted synchronously, so the store's selection is settled before we read it.
    this.selectRequest.emit(event);

    // Dragging any member of a selection moves the whole group together.
    const selected = this.session.selectedWidgets();
    const group = selected.some((w) => w.id === this.widget().id) ? selected : [this.widget()];
    this.dragGroup = group.map((widget) => ({ widget, origin: { x: widget.x(), y: widget.y() } }));

    this.dragStartPointer = { x: event.clientX, y: event.clientY };
    this.dragOffset.set({ x: 0, y: 0 });
    this.dragging.set(true);

    this.moveListener = (e: PointerEvent) => this.onMove(e);
    this.upListener = () => this.onEnd();
    window.addEventListener('pointermove', this.moveListener);
    window.addEventListener('pointerup', this.upListener, { once: true });
  }

  private onMove(event: PointerEvent): void {
    const dx = event.clientX - this.dragStartPointer.x;
    const dy = event.clientY - this.dragStartPointer.y;
    this.dragOffset.set({ x: dx, y: dy });

    // Column width is measured live (columns fill the canvas); rows are a fixed height.
    const columnStep = this.session.columnWidth() + GRID_GAP;
    const rowStep = ROW_HEIGHT + GRID_GAP;

    // Clamp the group as a unit so its members keep their relative positions.
    const deltaCols = this.clampGroupDelta(columnStep > GRID_GAP ? Math.round(dx / columnStep) : 0, 'x');
    const deltaRows = this.clampGroupDelta(Math.round(dy / rowStep), 'y');

    const invalid = this.groupCollides(deltaCols, deltaRows);
    this.pendingDelta = invalid ? null : { dx: deltaCols, dy: deltaRows };
    this.invalid.set(invalid);

    const self = this.dragGroup.find((entry) => entry.widget.id === this.widget().id);
    if (!self) return;
    this.gridPreview.emit({
      x: self.origin.x + deltaCols,
      y: self.origin.y + deltaRows,
      w: this.widget().w(),
      h: this.widget().h(),
      invalid,
    });
  }

  private onEnd(): void {
    this.cleanupListeners();
    if (this.pendingDelta) {
      const { dx, dy } = this.pendingDelta;
      for (const { widget, origin } of this.dragGroup) {
        widget.moveTo(origin.x + dx, origin.y + dy);
      }
    }
    this.pendingDelta = null;
    this.dragGroup = [];
    this.invalid.set(false);
    this.dragging.set(false);
    this.dragOffset.set(null);
    this.gridPreview.emit(null);
  }

  /** Limits the shift so no member of the group leaves the grid. */
  private clampGroupDelta(delta: number, axis: 'x' | 'y'): number {
    const limit = axis === 'x' ? this.session.gridColumns() : this.session.gridRows();

    let min = -Infinity;
    let max = Infinity;
    for (const { widget, origin } of this.dragGroup) {
      const size = axis === 'x' ? widget.w() : widget.h();
      const start = axis === 'x' ? origin.x : origin.y;
      min = Math.max(min, -start);
      max = Math.min(max, limit - size - start);
    }
    return clamp(delta, min, max);
  }

  private groupCollides(dx: number, dy: number): boolean {
    const moving = new Set(this.dragGroup.map((entry) => entry.widget.id));
    const others = this.session.widgets().filter((w) => !moving.has(w.id));

    return this.dragGroup.some(({ widget, origin }) => {
      const rect: GridRect = { x: origin.x + dx, y: origin.y + dy, w: widget.w(), h: widget.h() };
      return others.some((other) => rectsOverlap(rect, other.rect()));
    });
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
