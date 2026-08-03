import { Component, inject } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';

@Component({
  selector: 'app-panel-issues',
  imports: [],
  template: `
    @if (store.issues().length === 0) {
      <p class="panel-empty">
        <i class="pi pi-check-circle" aria-hidden="true"></i>
        Nothing to fix — the report is valid.
      </p>
    } @else {
      @if (store.saveBlocked()) {
        <p class="panel-issues__blocked">
          <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
          Changes aren't being saved until the errors below are fixed.
        </p>
      }

      <ul class="panel-issues">
        @for (issue of store.issues(); track issue.id) {
          <li>
            <button
              type="button"
              class="panel-issue"
              [class.panel-issue--error]="issue.severity === 'error'"
              (click)="store.goToIssue(issue)"
            >
              <i
                class="pi"
                [class.pi-times-circle]="issue.severity === 'error'"
                [class.pi-exclamation-circle]="issue.severity === 'warning'"
                aria-hidden="true"
              ></i>
              <span class="panel-issue__text">
                <span class="panel-issue__title">{{ issue.title }}</span>
                <span class="panel-issue__detail">{{ issue.detail }}</span>
              </span>
              <i class="pi pi-angle-right" aria-hidden="true"></i>
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .panel-issues__blocked {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0 0 4px;
      padding: 10px;
      border-radius: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b42318;
      font-size: 0.78rem;
    }

    .panel-issues {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .panel-issue {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--app-card-border);
      border-left: 3px solid #d97706;
      border-radius: 8px;
      background: #fff;
      font: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;

      &:hover {
        background: #f8fafc;
      }

      &--error {
        border-left-color: #dc2626;
      }

      > .pi:first-child {
        margin-top: 2px;
        color: #d97706;
      }

      &--error > .pi:first-child {
        color: #dc2626;
      }

      > .pi:last-child {
        margin-left: auto;
        align-self: center;
        color: #94a3b8;
        font-size: 0.75rem;
      }
    }

    .panel-issue__text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .panel-issue__title {
      font-size: 0.82rem;
      font-weight: 600;
    }

    .panel-issue__detail {
      font-size: 0.74rem;
      color: #64748b;
    }
  `,
})
export class PanelIssuesComponent {
  protected readonly store = inject(ReportBuilderStore);
}
