import { Component, computed, inject } from '@angular/core';
import { Popover } from 'primeng/popover';
import { DatasetsStore } from '../datasets.store';
import { IssueSummary } from '../../../shared/text/issue-summary';

@Component({
  selector: 'app-dataset-issues',
  imports: [Popover],
  templateUrl: './dataset-issues.component.html',
  styleUrl: './dataset-issues.component.scss',
})
export class DatasetIssuesComponent {
  public readonly tone = computed<'ok' | 'warning' | 'error'>(() => {
    const issues = this.issues();
    if (issues.some((i) => i.severity === 'error')) {
      return 'error';
    }
    if (issues.length) {
      return 'warning';
    }
    return 'ok';
  });

  public readonly label = computed(() => {
    const issues = this.issues();
    const errors = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.length - errors;
    return IssueSummary.headline(errors, warnings);
  });

  private readonly store = inject(DatasetsStore);

  public get issues() {
    return this.store.datasetIssues;
  }
}
