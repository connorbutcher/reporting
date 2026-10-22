import { Component, computed, input } from '@angular/core';
import { SaveTone } from './save-tone';

/** Autosave indicator, inline or as a `dot` for a status strip. */
@Component({
  selector: 'app-save-status',
  templateUrl: './save-status.component.html',
  styleUrl: './save-status.component.scss',
})
export class SaveStatusComponent {
  /** True while a save request is in flight. */
  public readonly saving = input.required<boolean>();
  /** True when the last save failed. */
  public readonly saveFailed = input.required<boolean>();
  public readonly dirty = input(false);

  /** `inline` shows an icon and full label; `dot` shows a coloured dot and a short label. */
  public readonly variant = input<'inline' | 'dot'>('inline');

  public readonly state = computed<{
    tone: SaveTone;
    icon: string;
    full: string;
    short: string;
  }>(() => {
    if (this.saveFailed()) {
      return {
        tone: 'error',
        icon: 'pi-exclamation-circle',
        full: 'Save failed',
        short: 'save failed',
      };
    }
    if (this.saving()) {
      return { tone: 'pending', icon: 'pi-spin pi-spinner', full: 'Saving…', short: 'saving…' };
    }
    if (this.dirty()) {
      return { tone: 'pending', icon: 'pi-circle-fill', full: 'Unsaved changes', short: 'unsaved' };
    }
    return { tone: 'ok', icon: 'pi-check', full: 'All changes saved', short: 'saved' };
  });
}
