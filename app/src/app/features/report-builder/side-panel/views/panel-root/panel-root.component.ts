import { Component, computed, inject } from '@angular/core';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelView } from '../../panel-view';

@Component({
  selector: 'app-panel-root',
  templateUrl: './panel-root.component.html',
  styleUrl: './panel-root.component.scss',
})
export class PanelRootComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly gridColumns = this.store.gridColumns;
  protected readonly gridRows = this.store.gridRows;
  protected readonly errors = this.store.errors;
  protected readonly issues = this.store.issues;

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

  protected navigate(view: PanelView): void {
    this.store.navigate(view);
  }
}
