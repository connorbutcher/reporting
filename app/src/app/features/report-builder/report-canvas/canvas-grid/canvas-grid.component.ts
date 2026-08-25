import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { GRID_GAP, ROW_HEIGHT, GridPreview } from '../../grid.util';
import { ReportLifecycle } from '../../state/report-lifecycle';
import { ReportSession } from '../../state/report-session';
import { WidgetSelection } from '../../state/widget-selection';
import { WidgetHostComponent } from '../../widget-host/widget-host.component';

/**
 * The editable grid: the report's widgets laid out on the snap grid, plus the
 * drop-preview overlay shown while a widget is being dragged or resized.
 *
 * Columns stretch to fill the canvas width so the report never scrolls
 * horizontally; only the number of columns changes how fine the grid is. The
 * grid element is measured on resize (and whenever the column count changes) so
 * the drag/resize maths and the background grid lines track the real column width.
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

  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly gridGap = GRID_GAP;
  protected readonly dropPreview = signal<GridPreview | null>(null);

  private readonly gridEl = viewChild<ElementRef<HTMLElement>>('grid');

  /** Fixed vertical pitch between rows; horizontal pitch is measured (see below). */
  protected readonly rowStep = ROW_HEIGHT + GRID_GAP;
  /** Horizontal pitch between columns, from the measured column width. */
  protected readonly columnStep = computed(() => this.session.columnWidth() + GRID_GAP);

  constructor() {
    // Measure the column width from the live grid, re-running whenever the column
    // count changes and whenever the element resizes with the window/panel.
    effect((onCleanup) => {
      const el = this.gridEl()?.nativeElement;
      const columns = this.session.gridColumns();
      if (!el) return;

      const measure = () => {
        const width = el.clientWidth;
        // clientWidth includes the grid's own padding only if box-sizing adds it;
        // the grid has none, so this is the track area. Subtract the gaps between
        // columns and divide by the count to get one column's width.
        const columnWidth = columns > 0 ? (width - (columns - 1) * GRID_GAP) / columns : 0;
        this.session.columnWidth.set(Math.max(0, columnWidth));
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  protected onDropPreview(preview: GridPreview | null): void {
    this.dropPreview.set(preview);
  }

  /** Clicking empty canvas drops the selection. */
  protected onCanvasPointerDown(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.selection.clear();
  }
}
