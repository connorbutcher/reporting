import { Injectable, computed, signal } from '@angular/core';

/** Selected canvas widgets, in selection order. */
@Injectable()
export class WidgetSelection {
  public readonly selectedWidgetIds = computed(() => this.ids());

  /** The most recent selection, which the side panel edits. */
  public readonly selectedWidgetId = computed(() => this.ids().at(-1) ?? null);
  public readonly hasMultiSelection = computed(() => this.ids().length > 1);

  private readonly ids = signal<readonly string[]>([]);

  public select(widgetId: string): void {
    this.ids.set([widgetId]);
  }

  /** For ctrl/shift-click on the canvas. */
  public toggle(widgetId: string): void {
    const current = this.ids();
    this.ids.set(
      current.includes(widgetId) ? current.filter((id) => id !== widgetId) : [...current, widgetId],
    );
  }

  public clear(): void {
    this.ids.set([]);
  }

  public has(widgetId: string): boolean {
    return this.ids().includes(widgetId);
  }

  public set(ids: readonly string[]): void {
    this.ids.set(ids);
  }

  public filterOut(widgetIds: readonly string[]): void {
    const doomed = new Set(widgetIds);
    this.ids.update((ids) => ids.filter((id) => !doomed.has(id)));
  }
}
