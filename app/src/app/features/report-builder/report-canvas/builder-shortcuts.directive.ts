import { Directive, inject } from '@angular/core';
import { ReportAutosave } from '../state/report-autosave';
import { WidgetCommands } from '../state/widget-commands';
import { WidgetSelection } from '../state/widget-selection';

/** Canvas keyboard shortcuts, listening on the document but never inside a text field. */
@Directive({
  selector: '[appBuilderShortcuts]',
  host: {
    '(document:keydown)': 'onKeyDown($event)',
  },
})
export class BuilderShortcutsDirective {
  private static readonly NUDGE = 1;

  private static readonly NUDGE_KEYS: Record<string, { dx: number; dy: number }> = {
    ArrowLeft: { dx: -BuilderShortcutsDirective.NUDGE, dy: 0 },
    ArrowRight: { dx: BuilderShortcutsDirective.NUDGE, dy: 0 },
    ArrowUp: { dx: 0, dy: -BuilderShortcutsDirective.NUDGE },
    ArrowDown: { dx: 0, dy: BuilderShortcutsDirective.NUDGE },
  };

  private readonly autosave = inject(ReportAutosave);
  private readonly commands = inject(WidgetCommands);
  private readonly selection = inject(WidgetSelection);

  private static isTextEntry(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (BuilderShortcutsDirective.isTextEntry(event.target)) return;

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

    const nudge = BuilderShortcutsDirective.NUDGE_KEYS[event.key];
    if (nudge && this.selection.selectedWidgetIds().length > 0) {
      event.preventDefault();
      this.commands.nudgeSelection(nudge.dx, nudge.dy);
    }
  }
}
