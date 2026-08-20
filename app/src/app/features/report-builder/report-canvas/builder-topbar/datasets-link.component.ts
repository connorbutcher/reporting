import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportBuilderStore } from '../../report-builder.store';

/** Secondary navigation to the report's dataset editor. */
@Component({
  selector: 'app-datasets-link',
  imports: [RouterLink],
  template: `
    @if (reportId(); as id) {
      <a
        class="datasets"
        [routerLink]="['/reports', id, 'edit', 'datasets']"
        title="Manage this report's datasets"
      >
        <i class="pi pi-database" aria-hidden="true"></i>
        Datasets
      </a>
    }
  `,
  styles: [
    `
      .datasets {
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
      .datasets:hover {
        background: var(--p-primary-50, #eef3fa);
        color: var(--app-navy);
      }
    `,
  ],
})
export class DatasetsLinkComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly reportId = computed(() => this.store.model()?.reportId ?? null);
}
