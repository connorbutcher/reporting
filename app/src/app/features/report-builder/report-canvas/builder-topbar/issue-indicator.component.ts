import { Component, computed, inject } from '@angular/core';
import { PanelNavigation } from '../../state/panel-navigation';
import { ReportSession } from '../../state/report-session';
import { IssueSummary } from '../../../../shared/text/issue-summary';

/** Opens the issues panel; a plain check while clean, coloured for warnings or errors. */
@Component({
  selector: 'app-issue-indicator',
  template: `
    <button
      type="button"
      class="issues"
      [class.warning]="tone() === 'warning'"
      [class.error]="tone() === 'error'"
      [title]="label()"
      (click)="open()"
    >
      <i
        class="pi"
        [class.pi-check-circle]="tone() === 'ok'"
        [class.pi-exclamation-triangle]="tone() !== 'ok'"
        aria-hidden="true"
      ></i>
      {{ label() }}
    </button>
  `,
  styles: [
    `
      .issues {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #475569;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 500;
        cursor: pointer;
      }
      .issues .pi-check-circle {
        color: #15803d;
      }
      .issues:hover {
        background: var(--p-primary-50, #eef3fa);
      }
      .issues.warning {
        background: #fffbeb;
        color: #b45309;
      }
      .issues.error {
        background: #fef2f2;
        color: #b42318;
      }
      .issues.warning:hover,
      .issues.error:hover {
        filter: brightness(0.98);
      }
    `,
  ],
})
export class IssueIndicatorComponent {
  public readonly tone = computed<'ok' | 'warning' | 'error'>(() => {
    if (this.session.errors().length) {
      return 'error';
    }
    if (this.session.warnings().length) {
      return 'warning';
    }
    return 'ok';
  });

  public readonly label = computed(() => {
    if (this.session.saveBlocked()) {
      return 'Fix errors';
    }
    return IssueSummary.headline(this.session.errors().length, this.session.warnings().length);
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public open(): void {
    this.navigation.navigate({ kind: 'issues' });
  }
}
