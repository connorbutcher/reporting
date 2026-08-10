import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { SortDirection } from '../../../core/models/report.model';
import { CELL_SIZE, GridPreview, GridRect, clamp, rectsOverlap } from '../grid.util';
import { ChartWidgetModel, DataTableWidgetModel, StaticTextWidgetModel, WidgetModel } from '../models/widget.model';
import { ReportBuilderStore } from '../report-builder.store';
import { ChartWidgetComponent } from '../widgets/chart-widget/chart-widget.component';
import { DataTableWidgetComponent } from '../widgets/data-table-widget/data-table-widget.component';
import { StaticTextWidgetComponent } from '../widgets/static-text-widget/static-text-widget.component';

type ResizeDirection = 'right' | 'bottom' | 'corner';

@Component({
  selector: 'app-widget-host',
  imports: [DataTableWidgetComponent, StaticTextWidgetComponent, ChartWidgetComponent],
  templateUrl: './widget-host.component.html',
  styleUrl: './widget-host.component.scss',
  host: {
    class: 'widget-host',
    '[style.grid-column]': 'gridColumn()',
    '[style.grid-row]': 'gridRow()',
  },
})
export class WidgetHostComponent {
  readonly widget = input.required<WidgetModel>();
  readonly gridPreview = output<GridPreview | null>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(ReportBuilderStore);

  protected readonly selected = computed(() => this.store.selectedWidgetIds().includes(this.widget().id));
  /** The one the side panel is editing, when several are selected at once. */
  protected readonly primary = computed(() => this.store.selectedWidgetId() === this.widget().id);
  protected readonly issues = computed(() => this.store.issuesByWidget().get(this.widget().id) ?? []);
  protected readonly hasError = computed(() => this.issues().some((i) => i.severity === 'error'));
  protected readonly issueLabel = computed(() => {
    const count = this.issues().length;
    return `${count} issue${count === 1 ? '' : 's'} on this widget — click to review`;
  });

  protected readonly gridColumn = computed(() => `${this.widget().x() + 1} / span ${this.widget().w()}`);
  protected readonly gridRow = computed(() => `${this.widget().y() + 1} / span ${this.widget().h()}`);
  protected readonly title = computed(() => this.widget().label());
  protected readonly showTitle = computed(() => this.widget().showTitle());

  // Narrowed once here rather than in the template, since Angular's control
  // flow can't infer that two separate `widget()` calls refer to the same value.
  private readonly tableModel = computed(() => {
    const widget = this.widget();
    return widget instanceof DataTableWidgetModel ? widget : null;
  });
  private readonly textModel = computed(() => {
    const widget = this.widget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });
  private readonly chartModel = computed(() => {
    const widget = this.widget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  /** The presentational widgets stay decoupled by taking plain config objects. */
  protected readonly tableConfig = computed(() => this.tableModel()?.toDto().config ?? null);
  protected readonly textConfig = computed(() => this.textModel()?.toDto().config ?? null);
  protected readonly chartConfig = computed(() => this.chartModel()?.toDto().config ?? null);
  protected readonly datasetVersion = computed(() => this.store.datasetVersion());

  /** Only the finished conditions, so a half-typed row doesn't blank the widget. */
  protected readonly widgetFilter = computed(
    () => this.tableModel()?.filter.toQueryDto() ?? this.chartModel()?.filter.toQueryDto() ?? null,
  );

  /** The report-level filter for this widget's dataset, layered over its own. */
  protected readonly reportFilter = computed(() => {
    const datasetId = this.tableModel()?.datasetId() ?? this.chartModel()?.datasetId();
    if (!datasetId) return null;
    return this.store.model()?.reportFilter(datasetId)?.group.toQueryDto() ?? null;
  });

  protected readonly dragging = signal(false);
  protected readonly dragOffset = signal<{ x: number; y: number } | null>(null);
  protected readonly dragTransform = computed(() => {
    const offset = this.dragOffset();
    return offset ? `translate(${offset.x}px, ${offset.y}px)` : null;
  });
  protected readonly dragInvalid = signal(false);
  protected readonly resizeInvalid = signal(false);
  protected readonly resizePreviewSize = signal<{ width: number; height: number } | null>(null);

  private dragStartPointer = { x: 0, y: 0 };
  /** Every widget moving in this drag, with where it started. */
  private dragGroup: { widget: WidgetModel; origin: { x: number; y: number } }[] = [];
  /** The accepted offset for the group, or null while it would collide. */
  private pendingDelta: { dx: number; dy: number } | null = null;
  private dragMoveListener: ((e: PointerEvent) => void) | null = null;
  private dragUpListener: ((e: PointerEvent) => void) | null = null;

  private resizeDirection: ResizeDirection = 'corner';
  private resizeStartCell = { w: 0, h: 0 };
  private resizeStartPointer = { x: 0, y: 0 };
  private pendingResize: GridRect | null = null;
  private resizeMoveListener: ((e: PointerEvent) => void) | null = null;
  private resizeUpListener: ((e: PointerEvent) => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cleanupDragListeners();
      this.cleanupResizeListeners();
    });
  }

  /** Ctrl/⌘ or shift extends the selection; a plain click replaces it. */
  protected select(event: PointerEvent | MouseEvent): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      this.store.toggleWidgetSelection(this.widget().id);
      return;
    }
    // Clicking a widget already in a multi-selection keeps the group intact so
    // the whole thing can be dragged.
    if (this.store.hasMultiSelection() && this.store.isSelected(this.widget().id)) return;
    this.store.selectWidget(this.widget().id);
  }

  protected showIssues(): void {
    this.store.selectedWidgetIds.set([this.widget().id]);
    this.store.navigate({ kind: 'issues' });
  }

  protected onSortChange(sort: { columnId: string; direction: SortDirection }): void {
    this.tableModel()?.setSort(sort.columnId, sort.direction);
  }

  /**
   * Persists widths after a drag-resize so the layout survives a reload. This
   * only ever updates widths on columns the user already chose: it must never
   * add or reorder columns, since layout reflows can trigger it too.
   */
  protected onColumnResize(widths: { columnId: string; width: number }[]): void {
    const table = this.tableModel();
    if (!table?.appearance.resizableColumns()) return;
    table.applyColumnWidths(widths);
  }

  protected onDragStart(event: PointerEvent): void {
    event.preventDefault();
    // The surface below also selects on pointerdown; letting this bubble would
    // run the toggle twice and cancel out a ctrl-click.
    event.stopPropagation();
    this.select(event);

    // Dragging any member of a selection moves the whole group together.
    const selected = this.store.selectedWidgets();
    const group = selected.some((w) => w.id === this.widget().id) ? selected : [this.widget()];
    this.dragGroup = group.map((widget) => ({ widget, origin: { x: widget.x(), y: widget.y() } }));

    this.dragStartPointer = { x: event.clientX, y: event.clientY };
    this.dragOffset.set({ x: 0, y: 0 });
    this.dragging.set(true);

    this.dragMoveListener = (e: PointerEvent) => this.onDragMove(e);
    this.dragUpListener = () => this.onDragEnd();
    window.addEventListener('pointermove', this.dragMoveListener);
    window.addEventListener('pointerup', this.dragUpListener, { once: true });
  }

  private onDragMove(event: PointerEvent): void {
    const dx = event.clientX - this.dragStartPointer.x;
    const dy = event.clientY - this.dragStartPointer.y;
    this.dragOffset.set({ x: dx, y: dy });

    // Clamp the group as a unit so its members keep their relative positions.
    const deltaCols = this.clampGroupDelta(Math.round(dx / CELL_SIZE), 'x');
    const deltaRows = this.clampGroupDelta(Math.round(dy / CELL_SIZE), 'y');

    const invalid = this.groupCollides(deltaCols, deltaRows);
    this.pendingDelta = invalid ? null : { dx: deltaCols, dy: deltaRows };
    this.dragInvalid.set(invalid);

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

  private onDragEnd(): void {
    this.cleanupDragListeners();
    if (this.pendingDelta) {
      const { dx, dy } = this.pendingDelta;
      for (const { widget, origin } of this.dragGroup) {
        widget.moveTo(origin.x + dx, origin.y + dy);
      }
    }
    this.pendingDelta = null;
    this.dragGroup = [];
    this.dragInvalid.set(false);
    this.dragging.set(false);
    this.dragOffset.set(null);
    this.gridPreview.emit(null);
  }

  /** Limits the shift so no member of the group leaves the grid. */
  private clampGroupDelta(delta: number, axis: 'x' | 'y'): number {
    const limit = axis === 'x' ? this.store.gridColumns() : this.store.gridRows();

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
    const model = this.store.model();
    if (!model) return true;

    const moving = new Set(this.dragGroup.map((entry) => entry.widget.id));
    const others = model.widgets().filter((w) => !moving.has(w.id));

    return this.dragGroup.some(({ widget, origin }) => {
      const rect: GridRect = { x: origin.x + dx, y: origin.y + dy, w: widget.w(), h: widget.h() };
      return others.some((other) => rectsOverlap(rect, other.rect()));
    });
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

    const widget = this.widget();
    this.resizeDirection = direction;
    this.resizeStartCell = { w: widget.w(), h: widget.h() };
    this.resizeStartPointer = { x: event.clientX, y: event.clientY };
    this.resizePreviewSize.set({ width: widget.w() * CELL_SIZE, height: widget.h() * CELL_SIZE });

    this.resizeMoveListener = (e: PointerEvent) => this.onResizeMove(e);
    this.resizeUpListener = () => this.onResizeEnd();
    window.addEventListener('pointermove', this.resizeMoveListener);
    window.addEventListener('pointerup', this.resizeUpListener, { once: true });
  }

  private onResizeMove(event: PointerEvent): void {
    const widget = this.widget();
    const dx = event.clientX - this.resizeStartPointer.x;
    const dy = event.clientY - this.resizeStartPointer.y;
    const deltaCols = Math.round(dx / CELL_SIZE);
    const deltaRows = Math.round(dy / CELL_SIZE);

    const candidateW =
      this.resizeDirection === 'bottom'
        ? widget.w()
        : clamp(this.resizeStartCell.w + deltaCols, 1, this.store.gridColumns() - widget.x());
    const candidateH =
      this.resizeDirection === 'right'
        ? widget.h()
        : clamp(this.resizeStartCell.h + deltaRows, 1, this.store.gridRows() - widget.y());
    const candidate: GridRect = { x: widget.x(), y: widget.y(), w: candidateW, h: candidateH };

    this.pendingResize = candidate;
    const invalid = this.collides(candidate);
    this.resizeInvalid.set(invalid);
    this.resizePreviewSize.set({ width: candidateW * CELL_SIZE, height: candidateH * CELL_SIZE });
    this.gridPreview.emit({ ...candidate, invalid });
  }

  private onResizeEnd(): void {
    this.cleanupResizeListeners();
    if (this.pendingResize && !this.collides(this.pendingResize)) {
      this.widget().resizeTo(this.pendingResize.w, this.pendingResize.h);
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

  private collides(candidate: GridRect): boolean {
    if (candidate.x < 0 || candidate.y < 0 || candidate.w < 1 || candidate.h < 1) return true;
    if (candidate.x + candidate.w > this.store.gridColumns()) return true;
    if (candidate.y + candidate.h > this.store.gridRows()) return true;

    const siblings = this.store.model()?.siblingsOf(this.widget().id) ?? [];
    return siblings.some((other) => rectsOverlap(candidate, other.rect()));
  }
}
