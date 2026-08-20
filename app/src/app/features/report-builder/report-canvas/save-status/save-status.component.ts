import { Component, computed, inject, input } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';

type SaveTone = 'ok' | 'pending' | 'error';

/**
 * Ambient indicator for the draft's autosave state — passive feedback the user
 * never acts on, so it stays quiet. Rendered inline under the report title and,
 * in its `dot` variant, on the canvas status strip.
 */
@Component({
  selector: 'app-save-status',
  template: `
    <span
      class="save"
      [class.ok]="state().tone === 'ok'"
      [class.pending]="state().tone === 'pending'"
      [class.error]="state().tone === 'error'"
      [class.is-dot]="variant() === 'dot'"
      [attr.role]="state().tone === 'error' ? 'alert' : null"
    >
      @if (variant() === 'dot') {
        <span class="dot" aria-hidden="true"></span>{{ state().short }}
      } @else {
        <i class="pi" [class]="state().icon" aria-hidden="true"></i>{{ state().full }}
      }
    </span>
  `,
  styles: [
    `
      .save {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.75rem;
        font-weight: 500;
      }
      .save.ok {
        color: #94a3b8;
      }
      .save.ok.is-dot {
        color: #15803d;
      }
      .save.pending {
        color: #64748b;
      }
      .save.error {
        color: #b42318;
        font-weight: 600;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
      }
    `,
  ],
})
export class SaveStatusComponent {
  private readonly store = inject(ReportBuilderStore);

  /** `inline` shows an icon and full label; `dot` shows a coloured dot and a short label. */
  readonly variant = input<'inline' | 'dot'>('inline');

  protected readonly state = computed<{ tone: SaveTone; icon: string; full: string; short: string }>(
    () => {
      if (this.store.saveFailed())
        return { tone: 'error', icon: 'pi-exclamation-circle', full: 'Save failed', short: 'save failed' };
      if (this.store.saving())
        return { tone: 'pending', icon: 'pi-spin pi-spinner', full: 'Saving…', short: 'saving…' };
      if (this.store.dirty())
        return { tone: 'pending', icon: 'pi-circle-fill', full: 'Unsaved changes', short: 'unsaved' };
      return { tone: 'ok', icon: 'pi-check', full: 'All changes saved', short: 'saved' };
    },
  );
}
