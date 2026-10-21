import { Component, computed, inject } from '@angular/core';
import { ReportSession } from '../../state/report-session';
import { TopbarLinkComponent } from './topbar-link.component';

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
  public readonly reportId = computed(() => this.session.model()?.reportId ?? null);

  private readonly session = inject(ReportSession);
}
