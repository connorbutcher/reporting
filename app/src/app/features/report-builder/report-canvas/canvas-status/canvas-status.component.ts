import { Component, computed, inject } from '@angular/core';
import { ReportAutosave } from '../../state/report-autosave';
import { ReportSession } from '../../state/report-session';
import { WidgetSelection } from '../../state/widget-selection';
import { SaveStatusComponent } from '../../../../shared/save-status/save-status.component';

/** The canvas status bar: grid size, widget count, selection and a live save dot. */
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
      <app-save-status
        variant="dot"
        [saving]="saving()"
        [saveFailed]="saveFailed()"
        [dirty]="dirty()"
      />
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
  public readonly widgetCount = computed(() => this.session.widgets().length);
  public readonly selectedCount = computed(() => this.selection.selectedWidgetIds().length);

  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly autosave = inject(ReportAutosave);

  public get gridColumns() {
    return this.session.gridColumns;
  }

  public get gridRows() {
    return this.session.gridRows;
  }

  public get hasMultiSelection() {
    return this.selection.hasMultiSelection;
  }

  public get saving() {
    return this.autosave.saving;
  }

  public get saveFailed() {
    return this.autosave.saveFailed;
  }

  public get dirty() {
    return this.session.dirty;
  }
}
