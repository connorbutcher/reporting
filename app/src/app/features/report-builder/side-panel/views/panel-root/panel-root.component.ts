import { Component, computed, inject } from '@angular/core';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';

@Component({
  selector: 'app-panel-root',
  templateUrl: './panel-root.component.html',
  styleUrl: './panel-root.component.scss',
})
export class PanelRootComponent {
  public static readonly title = 'Report builder';

  public readonly widgetCount = computed(() => this.session.widgets().length);

  public readonly reportFilterSummary = computed(() => {
    const filters = this.session.model()?.filters() ?? [];
    const count = filters.reduce((n, f) => n + f.group.count(), 0);
    if (count === 0) return 'Applied per dataset to every widget on this report';
    return `${count} condition${count > 1 ? 's' : ''} across ${filters.filter((f) => f.group.count() > 0).length} dataset(s)`;
  });

  public readonly issueSummary = computed(() => {
    const errors = this.session.errors().length;
    const warnings = this.session.warnings().length;
    if (!errors && !warnings) return 'No problems found';

    const parts: string[] = [];
    if (errors) parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
    if (warnings) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
    return parts.join(' · ');
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  public get gridColumns() {
    return this.session.gridColumns;
  }

  public get gridRows() {
    return this.session.gridRows;
  }

  public get errors() {
    return this.session.errors;
  }

  public get issues() {
    return this.session.issues;
  }
}
