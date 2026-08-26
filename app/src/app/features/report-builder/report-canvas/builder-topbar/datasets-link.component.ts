import { Component, computed, inject } from '@angular/core';
import { ReportSession } from '../../state/report-session';
import { TopbarLinkComponent } from './topbar-link.component';

/** Secondary navigation to the report's dataset editor. */
@Component({
  selector: 'app-datasets-link',
  imports: [TopbarLinkComponent],
  template: `
    @if (reportId(); as id) {
      <app-topbar-link
        [link]="['/reports', id, 'edit', 'datasets']"
        icon="pi-database"
        label="Datasets"
        title="Manage this report's datasets"
      />
    }
  `,
})
export class DatasetsLinkComponent {
  private readonly session = inject(ReportSession);

  protected readonly reportId = computed(() => this.session.model()?.reportId ?? null);
}
