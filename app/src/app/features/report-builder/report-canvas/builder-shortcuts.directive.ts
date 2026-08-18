import { Directive, inject } from '@angular/core';
import { ReportBuilderStore } from '../report-builder.store';

/** Nudging by a whole cell keeps widgets on the grid. */
const NUDGE = 1;

/**
 * Keyboard shortcuts for editing the canvas: undo/redo, duplicate, delete,
 * arrow-key nudging, and clearing the selection. Listens on the document so
 * the shortcuts work wherever focus is, except inside a text field.
 */
@Directive({
  selector: '[appBuilderShortcuts]',
  host: {
    '(document:keydown)': 'onKeyDown($event)',
  },
})
export class BuilderShortcutsDirective {
  private readonly store = inject(ReportBuilderStore);

  protected onKeyDown(event: KeyboardEvent): void {
    // Never steal keys from a field the user is typing in.
    if (isTextEntry(event.target)) return;

    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.store.redo();
      else this.store.undo();
      return;
    }

    if (ctrl && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.store.redo();
      return;
    }

    if (ctrl && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.store.duplicateSelection();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const ids = this.store.selectedWidgetIds();
      if (ids.length === 0) return;
      event.preventDefault();
      this.store.removeWidgets(ids);
      return;
    }

    if (event.key === 'Escape') {
      this.store.clearSelection();
      return;
    }

    const nudge = NUDGE_KEYS[event.key];
    if (nudge && this.store.selectedWidgetIds().length > 0) {
      event.preventDefault();
      this.store.nudgeSelection(nudge.dx, nudge.dy);
    }
  }
}

const NUDGE_KEYS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -NUDGE, dy: 0 },
  ArrowRight: { dx: NUDGE, dy: 0 },
  ArrowUp: { dx: 0, dy: -NUDGE },
  ArrowDown: { dx: 0, dy: NUDGE },
};

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
