import { computed, signal } from '@angular/core';
import { PanelView } from '../side-panel/panel-view';

/**
 * Where the side panel has been, as a linear back/forward history — separate
 * from the report's own undo stack, which tracks edits, not navigation.
 */
export class SidePanelNavigation {
  private readonly history = signal<PanelView[]>([{ kind: 'root' }]);
  private readonly index = signal(0);

  readonly view = computed(() => this.history()[this.index()]);
  readonly canGoBack = computed(() => this.index() > 0);
  readonly canGoForward = computed(() => this.index() < this.history().length - 1);

  navigate(view: PanelView): void {
    // Navigating from a point in history discards anything after it.
    const trimmed = this.history().slice(0, this.index() + 1);
    this.history.set([...trimmed, view]);
    this.index.set(trimmed.length);
  }

  /** Replaces the current entry, for stepping sideways without adding history. */
  replace(view: PanelView): void {
    this.history.update((views) => views.map((v, i) => (i === this.index() ? view : v)));
  }

  back(): void {
    if (!this.canGoBack()) return;
    this.index.update((i) => i - 1);
  }

  forward(): void {
    if (!this.canGoForward()) return;
    this.index.update((i) => i + 1);
  }
}
