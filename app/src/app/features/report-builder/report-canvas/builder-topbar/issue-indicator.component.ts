import { Component, computed, inject } from '@angular/core';
import { PanelNavigation } from '../../state/panel-navigation';
import { ReportSession } from '../../state/report-session';

/**
 * The report's validation state, as a button into the issues panel. Stays quiet
 * (a plain check) while the report is clean, and only takes on colour when there
 * are warnings or errors to draw attention to.
 */
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
  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  protected readonly tone = computed<'ok' | 'warning' | 'error'>(() => {
    if (this.session.errors().length) return 'error';
    if (this.session.warnings().length) return 'warning';
    return 'ok';
  });

  protected readonly label = computed(() => {
    if (this.session.saveBlocked()) return 'Fix errors';
    const errors = this.session.errors().length;
    const warnings = this.session.warnings().length;
    if (errors) return `${errors} error${errors > 1 ? 's' : ''}`;
    if (warnings) return `${warnings} warning${warnings > 1 ? 's' : ''}`;
    return 'No issues';
  });

  protected open(): void {
    this.navigation.navigate({ kind: 'issues' });
  }
}
