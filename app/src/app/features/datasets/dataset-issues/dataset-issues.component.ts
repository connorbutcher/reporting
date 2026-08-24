import { Component, computed, inject } from '@angular/core';
import { Popover } from 'primeng/popover';
import { DatasetsStore } from '../datasets.store';

/**
 * The selected dataset's validation state, as a compact toolbar chip — the
 * datasets-screen equivalent of the report builder's issue indicator. Stays a
 * quiet green check while the dataset is valid, taking on colour only when there
 * are warnings or errors; clicking it opens a popover listing the problems.
 */
@Component({
  selector: 'app-dataset-issues',
  imports: [Popover],
  templateUrl: './dataset-issues.component.html',
  styleUrl: './dataset-issues.component.scss',
})
export class DatasetIssuesComponent {
  private readonly store = inject(DatasetsStore);

  protected readonly issues = this.store.datasetIssues;

  protected readonly tone = computed<'ok' | 'warning' | 'error'>(() => {
    const issues = this.issues();
    if (issues.some((i) => i.severity === 'error')) return 'error';
    if (issues.length) return 'warning';
    return 'ok';
  });

  protected readonly label = computed(() => {
    const issues = this.issues();
    const errors = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.length - errors;
    if (errors) return `${errors} error${errors > 1 ? 's' : ''}`;
    if (warnings) return `${warnings} warning${warnings > 1 ? 's' : ''}`;
    return 'No issues';
  });
}
