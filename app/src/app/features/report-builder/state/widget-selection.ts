import { computed, signal } from '@angular/core';

/** Which widgets are selected on the canvas, in the order they were added. */
export class WidgetSelection {
  private readonly ids = signal<readonly string[]>([]);

  readonly selectedWidgetIds = this.ids.asReadonly();

  /**
   * The widget the side panel configures — the most recently selected one.
   * Multi-selection is for canvas operations; the panel always edits one.
   */
  readonly selectedWidgetId = computed(() => this.ids().at(-1) ?? null);
  readonly hasMultiSelection = computed(() => this.ids().length > 1);

  select(widgetId: string): void {
    this.ids.set([widgetId]);
  }

  /** Adds to or removes from the selection, for ctrl/shift-clicking on the canvas. */
  toggle(widgetId: string): void {
    const current = this.ids();
    this.ids.set(
      current.includes(widgetId) ? current.filter((id) => id !== widgetId) : [...current, widgetId],
    );
  }

  clear(): void {
    this.ids.set([]);
  }

  has(widgetId: string): boolean {
    return this.ids().includes(widgetId);
  }

  set(ids: readonly string[]): void {
    this.ids.set(ids);
  }

  /** Drops any of the given ids from the selection, e.g. after they're removed. */
  filterOut(widgetIds: readonly string[]): void {
    const doomed = new Set(widgetIds);
    this.ids.update((ids) => ids.filter((id) => !doomed.has(id)));
  }
}
