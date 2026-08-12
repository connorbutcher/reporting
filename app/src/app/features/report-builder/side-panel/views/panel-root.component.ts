import { Component, computed, inject } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';

@Component({
  selector: 'app-panel-root',
  imports: [],
  template: `
    <nav class="panel-menu">
      <button type="button" class="panel-menu-item" (click)="store.navigate({ kind: 'report' })">
        <i class="pi pi-th-large" aria-hidden="true"></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Report settings</span>
          <span class="panel-menu-hint"
            >{{ store.gridColumns() }} × {{ store.gridRows() }} grid</span
          >
        </span>
        <i class="pi pi-angle-right" aria-hidden="true"></i>
      </button>
      <button type="button" class="panel-menu-item" (click)="store.navigate({ kind: 'widgets' })">
        <i class="pi pi-objects-column" aria-hidden="true"></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Widgets</span>
          <span class="panel-menu-hint">{{ widgetCount() }} on canvas</span>
        </span>
        <i class="pi pi-angle-right" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="panel-menu-item"
        (click)="store.navigate({ kind: 'reportFilters' })"
      >
        <i class="pi pi-filter" aria-hidden="true"></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Report filters</span>
          <span class="panel-menu-hint">{{ reportFilterSummary() }}</span>
        </span>
        <i class="pi pi-angle-right" aria-hidden="true"></i>
      </button>
      <button type="button" class="panel-menu-item" (click)="store.navigate({ kind: 'addWidget' })">
        <i class="pi pi-plus-circle" aria-hidden="true"></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Add widget</span>
          <span class="panel-menu-hint">Place a new widget on the canvas</span>
        </span>
        <i class="pi pi-angle-right" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="panel-menu-item"
        [class.panel-menu-item--error]="store.errors().length > 0"
        (click)="store.navigate({ kind: 'issues' })"
      >
        <i
          class="pi"
          [class.pi-check-circle]="store.issues().length === 0"
          [class.pi-exclamation-triangle]="store.issues().length > 0"
          aria-hidden="true"
        ></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Issues</span>
          <span class="panel-menu-hint">{{ issueSummary() }}</span>
        </span>
        <i class="pi pi-angle-right" aria-hidden="true"></i>
      </button>
    </nav>
  `,
  styles: `
    .panel-menu {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .panel-menu-item--error {
      border-color: #fecaca;

      > .pi:first-child {
        color: #dc2626;
      }
    }
  `,
})
export class PanelRootComponent {
  protected readonly store = inject(ReportBuilderStore);
  protected readonly widgetCount = computed(() => this.store.widgets().length);

  /** Conditions across every dataset's report-level filter. */
  protected readonly reportFilterSummary = computed(() => {
    const filters = this.store.model()?.filters() ?? [];
    const count = filters.reduce((n, f) => n + f.group.count(), 0);
    if (count === 0) return 'Applied to every table on this report';
    return `${count} condition${count > 1 ? 's' : ''} across ${filters.filter((f) => f.group.count() > 0).length} dataset(s)`;
  });

  protected readonly issueSummary = computed(() => {
    const errors = this.store.errors().length;
    const warnings = this.store.warnings().length;
    if (!errors && !warnings) return 'No problems found';

    const parts: string[] = [];
    if (errors) parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
    if (warnings) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
    return parts.join(' · ');
  });
}
