import { Component, inject, signal } from '@angular/core';
import { CELL_SIZE, GRID_GAP, GridPreview } from '../../grid.util';
import { ReportBuilderStore } from '../../report-builder.store';
import { WidgetHostComponent } from '../../widget-host/widget-host.component';

/**
 * The editable grid: the report's widgets laid out on the snap grid, plus the
 * drop-preview overlay shown while a widget is being dragged or resized.
 */
@Component({
  selector: 'app-canvas-grid',
  imports: [WidgetHostComponent],
  templateUrl: './canvas-grid.component.html',
  styleUrl: './canvas-grid.component.scss',
})
export class CanvasGridComponent {
  protected readonly store = inject(ReportBuilderStore);

  protected readonly cellSize = CELL_SIZE;
  protected readonly gridGap = GRID_GAP;
  protected readonly dropPreview = signal<GridPreview | null>(null);

  protected onDropPreview(preview: GridPreview | null): void {
    this.dropPreview.set(preview);
  }

  /** Clicking empty canvas drops the selection. */
  protected onCanvasPointerDown(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.store.clearSelection();
  }
}
