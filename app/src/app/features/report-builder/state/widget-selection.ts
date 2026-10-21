import { Injectable, computed, signal } from '@angular/core';

/** Selected canvas widgets, in selection order. */
@Injectable()
export class WidgetSelection {
  private readonly ids = signal<readonly string[]>([]);

  readonly selectedWidgetIds = this.ids.asReadonly();

  /** The most recent selection, which the side panel edits. */
  readonly selectedWidgetId = computed(() => this.ids().at(-1) ?? null);
  readonly hasMultiSelection = computed(() => this.ids().length > 1);

  select(widgetId: string): void {
    this.ids.set([widgetId]);
  }

  /** For ctrl/shift-click on the canvas. */
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

  filterOut(widgetIds: readonly string[]): void {
    const doomed = new Set(widgetIds);
    this.ids.update((ids) => ids.filter((id) => !doomed.has(id)));
  }
}
