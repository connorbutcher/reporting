import { Component, inject } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';

/** Undo/redo for the report's edit history, as one segmented control. */
@Component({
  selector: 'app-history-controls',
  template: `
    <div class="history">
      <button
        type="button"
        class="icon-button"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        [disabled]="!canUndo()"
        (click)="undo()"
      >
        <i class="pi pi-undo" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="icon-button"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
        [disabled]="!canRedo()"
        (click)="redo()"
      >
        <i class="pi pi-refresh" aria-hidden="true"></i>
      </button>
    </div>
  `,
  styles: [
    `
      .history {
        display: inline-flex;
        border: 1px solid var(--app-card-border);
        border-radius: 8px;
        overflow: hidden;
      }
      .icon-button {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border: 0;
        background: #fff;
        color: #475569;
        cursor: pointer;
      }
      .icon-button + .icon-button {
        border-left: 1px solid var(--app-card-border);
      }
      .icon-button:hover:not(:disabled) {
        background: var(--p-primary-50, #eef3fa);
        color: var(--app-navy);
      }
      .icon-button:disabled {
        opacity: 0.4;
        cursor: default;
      }
    `,
  ],
})
export class HistoryControlsComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly canUndo = this.store.canUndo;
  protected readonly canRedo = this.store.canRedo;

  protected undo(): void {
    this.store.undo();
  }

  protected redo(): void {
    this.store.redo();
  }
}
