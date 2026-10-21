import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { GridLayout } from '../../grid/grid-layout';
import { GridPreview } from '../../grid/grid-preview';
import { ReportLifecycle } from '../../state/report-lifecycle';
import { ReportSession } from '../../state/report-session';
import { WidgetSelection } from '../../state/widget-selection';
import { WidgetHostComponent } from '../../widget-host/widget-host.component';

/**
 * The editable grid: widgets on the snap grid, plus the drop preview while dragging or resizing.
 * Columns stretch to the canvas width, so the column width is measured on resize.
 */
@Component({
  selector: 'app-canvas-grid',
  imports: [WidgetHostComponent],
  templateUrl: './canvas-grid.component.html',
  styleUrl: './canvas-grid.component.scss',
})
export class CanvasGridComponent {
  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly lifecycle = inject(ReportLifecycle);

  protected readonly loading = this.lifecycle.loading;
  protected readonly widgets = this.session.widgets;
  protected readonly gridColumns = this.session.gridColumns;
  protected readonly gridRows = this.session.gridRows;

  protected readonly rowHeight = GridLayout.ROW_HEIGHT;
  protected readonly gridGap = GridLayout.GRID_GAP;
  protected readonly dropPreview = signal<GridPreview | null>(null);

  private readonly gridEl = viewChild<ElementRef<HTMLElement>>('grid');

  protected readonly rowStep = GridLayout.ROW_HEIGHT + GridLayout.GRID_GAP;
  protected readonly columnStep = computed(() => this.session.columnWidth() + GridLayout.GRID_GAP);

  constructor() {
    // Re-measure when the column count changes or the element resizes.
    effect((onCleanup) => {
      const el = this.gridEl()?.nativeElement;
      const columns = this.session.gridColumns();
      if (!el) return;

      this.measureColumnWidth(el, columns);
      const observer = new ResizeObserver(() => this.measureColumnWidth(el, columns));
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  protected onDropPreview(preview: GridPreview | null): void {
    this.dropPreview.set(preview);
  }

  /** Clicking empty canvas clears the selection. */
  protected onCanvasPointerDown(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.selection.clear();
  }

  /** The grid has no padding, so its client width less the gaps is the track area. */
  private measureColumnWidth(el: HTMLElement, columns: number): void {
    const columnWidth =
      columns > 0 ? (el.clientWidth - (columns - 1) * GridLayout.GRID_GAP) / columns : 0;
    this.session.columnWidth.set(Math.max(0, columnWidth));
  }
}
