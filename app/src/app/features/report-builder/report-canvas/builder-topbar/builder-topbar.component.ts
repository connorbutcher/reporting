import { Component, inject } from '@angular/core';
import { SaveStatusComponent } from '../../../../shared/save-status/save-status.component';
import { ReportAutosave } from '../../state/report-autosave';
import { ReportSession } from '../../state/report-session';
import { BackToReportComponent } from './back-to-report.component';
import { BuilderIdentityComponent } from './builder-identity.component';
import { DatasetsLinkComponent } from './datasets-link.component';
import { HistoryControlsComponent } from './history-controls.component';
import { IssueIndicatorComponent } from './issue-indicator.component';
import { PublishButtonComponent } from './publish-button.component';

/**
 * The report bar at the top of the canvas card — the builder's own header,
 * below the app's global nav. Pure layout: two zones, identity on the left and
 * tools plus actions on the right, composed from small single-purpose controls
 * that each read the shared store.
 */
@Component({
  selector: 'app-builder-topbar',
  imports: [
    BackToReportComponent,
    BuilderIdentityComponent,
    SaveStatusComponent,
    HistoryControlsComponent,
    IssueIndicatorComponent,
    DatasetsLinkComponent,
    PublishButtonComponent,
  ],
  template: `
    <header class="topbar">
      <app-back-to-report />
      <div class="identity">
        <app-builder-identity />
        <app-save-status [saving]="saving()" [saveFailed]="saveFailed()" [dirty]="dirty()" />
      </div>

      <div class="actions">
        <app-history-controls />
        <span class="divider" aria-hidden="true"></span>
        <app-issue-indicator />
        <app-datasets-link />
        <app-publish-button />
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        display: flex;
        align-items: center;
        gap: 14px;
        height: 56px;
        padding: 0 18px;
        border-bottom: 1px solid var(--app-card-border);
      }
      .identity {
        display: flex;
        flex-direction: column;
        gap: 1px;
        line-height: 1.15;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }
      .divider {
        width: 1px;
        height: 22px;
        background: var(--app-card-border);
      }
    `,
  ],
})
export class BuilderTopbarComponent {
  private readonly session = inject(ReportSession);
  private readonly autosave = inject(ReportAutosave);

  protected readonly saving = this.autosave.saving;
  protected readonly saveFailed = this.autosave.saveFailed;
  protected readonly dirty = this.session.dirty;
}
