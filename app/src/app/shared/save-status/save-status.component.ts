import { Component, computed, input } from '@angular/core';

type SaveTone = 'ok' | 'pending' | 'error';

/**
 * Ambient indicator for a draft's autosave state — passive feedback the user never
 * acts on, so it stays quiet. Presentational: the owning screen feeds it the three
 * booleans from its own store, so the same pill serves the report builder and the
 * datasets editor. Rendered inline (icon + full label) or, in its `dot` variant, as
 * a coloured dot and short label for a status strip.
 */
@Component({
  selector: 'app-save-status',
  templateUrl: './save-status.component.html',
  styleUrl: './save-status.component.scss',
})
export class SaveStatusComponent {
  /** True while a save request is in flight. */
  readonly saving = input.required<boolean>();
  /** True when the last save failed. */
  readonly saveFailed = input.required<boolean>();
  /**
   * True when there are edits not yet saved. Screens that persist every edit
   * immediately (no deferred write) can leave this at its default.
   */
  readonly dirty = input(false);

  /** `inline` shows an icon and full label; `dot` shows a coloured dot and a short label. */
  readonly variant = input<'inline' | 'dot'>('inline');

  protected readonly state = computed<{ tone: SaveTone; icon: string; full: string; short: string }>(
    () => {
      if (this.saveFailed())
        return { tone: 'error', icon: 'pi-exclamation-circle', full: 'Save failed', short: 'save failed' };
      if (this.saving())
        return { tone: 'pending', icon: 'pi-spin pi-spinner', full: 'Saving…', short: 'saving…' };
      if (this.dirty())
        return { tone: 'pending', icon: 'pi-circle-fill', full: 'Unsaved changes', short: 'unsaved' };
      return { tone: 'ok', icon: 'pi-check', full: 'All changes saved', short: 'saved' };
    },
  );
}
