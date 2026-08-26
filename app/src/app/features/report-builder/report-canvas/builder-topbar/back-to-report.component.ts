import { Component, inject } from '@angular/core';
import { ReportSession } from '../../state/report-session';
import { TopbarLinkComponent } from './topbar-link.component';

/**
 * Leaves the builder and returns to the report's view page. In-app navigation, so
 * the unsaved-changes guard still gets a chance to confirm before any pending save
 * is abandoned. The report id comes from the route, so the link is there even
 * before the draft has loaded.
 */
@Component({
  selector: 'app-back-to-report',
  imports: [TopbarLinkComponent],
  template: `
    @if (reportId(); as id) {
      <app-topbar-link
        [link]="['/reports', id]"
        icon="pi-arrow-left"
        label="Back to report"
        title="Return to the report view"
      />
    }
  `,
})
export class BackToReportComponent {
  private readonly session = inject(ReportSession);

  protected readonly reportId = this.session.reportId;
}
