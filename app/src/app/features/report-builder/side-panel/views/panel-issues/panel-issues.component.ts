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
  public static readonly title = 'Report issues';

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public goToIssue(issue: ValidationIssue): void {
    this.navigation.goToIssue(issue);
  }

  public get issues() {
    return this.session.issues;
  }

  public get saveBlocked() {
    return this.session.saveBlocked;
  }
}
