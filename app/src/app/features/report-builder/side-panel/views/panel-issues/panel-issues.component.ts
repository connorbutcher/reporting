import { Component, inject } from '@angular/core';
import { ReportBuilderStore } from '../../../report-builder.store';
import { ValidationIssue } from '../../../models/validation-issue';

@Component({
  selector: 'app-panel-issues',
  templateUrl: './panel-issues.component.html',
  styleUrl: './panel-issues.component.scss',
})
export class PanelIssuesComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly issues = this.store.issues;
  protected readonly saveBlocked = this.store.saveBlocked;

  protected goToIssue(issue: ValidationIssue): void {
    this.store.goToIssue(issue);
  }
}
