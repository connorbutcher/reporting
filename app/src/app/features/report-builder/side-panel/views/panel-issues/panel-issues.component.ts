import { Component, inject } from '@angular/core';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ValidationIssue } from '../../../models/validation-issue';

@Component({
  selector: 'app-panel-issues',
  templateUrl: './panel-issues.component.html',
  styleUrl: './panel-issues.component.scss',
})
export class PanelIssuesComponent {
  static readonly title = 'Report issues';

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  protected readonly issues = this.session.issues;
  protected readonly saveBlocked = this.session.saveBlocked;

  protected goToIssue(issue: ValidationIssue): void {
    this.navigation.goToIssue(issue);
  }
}
