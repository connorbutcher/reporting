import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportSession } from '../../state/report-session';

/**
 * Leaves the builder and returns to the report's view page. In-app navigation, so
 * the unsaved-changes guard still gets a chance to confirm before any pending save
 * is abandoned. The report id comes from the route, so the link is there even
 * before the draft has loaded.
 */
@Component({
  selector: 'app-back-to-report',
  imports: [RouterLink],
  template: `
    @if (reportId(); as id) {
      <a class="back" [routerLink]="['/reports', id]" title="Return to the report view">
        <i class="pi pi-arrow-left" aria-hidden="true"></i>
        Back to report
      </a>
    }
  `,
  styles: [
    `
      .back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid var(--app-card-border);
        border-radius: 8px;
        background: #fff;
        color: #475569;
        font-size: 0.78rem;
        font-weight: 500;
        text-decoration: none;
      }
      .back:hover {
        background: var(--p-primary-50, #eef3fa);
        color: var(--app-navy);
      }
    `,
  ],
})
export class BackToReportComponent {
  private readonly session = inject(ReportSession);

  protected readonly reportId = this.session.reportId;
}
