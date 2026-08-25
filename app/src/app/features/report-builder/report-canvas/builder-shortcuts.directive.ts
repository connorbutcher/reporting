import { Directive, inject } from '@angular/core';
import { ReportAutosave } from '../state/report-autosave';
import { WidgetCommands } from '../state/widget-commands';
import { WidgetSelection } from '../state/widget-selection';

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
  private readonly autosave = inject(ReportAutosave);
  private readonly commands = inject(WidgetCommands);
  private readonly selection = inject(WidgetSelection);

  protected onKeyDown(event: KeyboardEvent): void {
    // Never steal keys from a field the user is typing in.
    if (isTextEntry(event.target)) return;

    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.autosave.redo();
      else this.autosave.undo();
      return;
    }

    if (ctrl && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.autosave.redo();
      return;
    }

    if (ctrl && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.commands.duplicateSelection();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const ids = this.selection.selectedWidgetIds();
      if (ids.length === 0) return;
      event.preventDefault();
      this.commands.removeWidgets(ids);
      return;
    }

    if (event.key === 'Escape') {
      this.selection.clear();
      return;
    }

    const nudge = NUDGE_KEYS[event.key];
    if (nudge && this.selection.selectedWidgetIds().length > 0) {
      event.preventDefault();
      this.commands.nudgeSelection(nudge.dx, nudge.dy);
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
