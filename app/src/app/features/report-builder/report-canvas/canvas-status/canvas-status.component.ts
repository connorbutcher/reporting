import { Component, computed, inject } from '@angular/core';
import { ReportAutosave } from '../../state/report-autosave';
import { ReportSession } from '../../state/report-session';
import { WidgetSelection } from '../../state/widget-selection';
import { SaveStatusComponent } from '../../../../shared/save-status/save-status.component';

/**
 * The slim strip along the bottom of the canvas — an editor-style status bar for
 * the passive facts about what's on it: grid size, widget count, current
 * selection, and a live save dot. This is where the top bar's old grid meta went.
 */
@Component({
  selector: 'app-canvas-status',
  imports: [SaveStatusComponent],
  template: `
    <div class="status">
      <span>{{ gridColumns() }} × {{ gridRows() }} grid</span>
      <span class="sep" aria-hidden="true">·</span>
      <span>{{ widgetCount() }} widget{{ widgetCount() === 1 ? '' : 's' }}</span>
      @if (hasMultiSelection()) {
        <span class="sep" aria-hidden="true">·</span>
        <span>{{ selectedCount() }} selected</span>
      }
      <span class="spacer"></span>
      <app-save-status variant="dot" [saving]="saving()" [saveFailed]="saveFailed()" [dirty]="dirty()" />
    </div>
  `,
  styles: [
    `
      .status {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 30px;
        padding: 0 16px;
        border-top: 1px solid var(--app-card-border);
        background: #fbfcfe;
        font-size: 0.72rem;
        color: #64748b;
      }
      .sep {
        color: #cbd5e1;
      }
      .spacer {
        margin-left: auto;
      }
    `,
  ],
})
export class CanvasStatusComponent {
  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly autosave = inject(ReportAutosave);

  protected readonly gridColumns = this.session.gridColumns;
  protected readonly gridRows = this.session.gridRows;
  protected readonly hasMultiSelection = this.selection.hasMultiSelection;
  protected readonly widgetCount = computed(() => this.session.widgets().length);
  protected readonly selectedCount = computed(() => this.selection.selectedWidgetIds().length);
  protected readonly saving = this.autosave.saving;
  protected readonly saveFailed = this.autosave.saveFailed;
  protected readonly dirty = this.session.dirty;
}
