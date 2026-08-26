import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * A secondary navigation link in the builder topbar — the shared look (pill
 * button with a leading icon) behind the "Datasets" and "Back to report" links,
 * so the styling lives in one place.
 */
@Component({
  selector: 'app-topbar-link',
  imports: [RouterLink],
  template: `
    <a class="topbar-link" [routerLink]="link()" [title]="title()">
      <i class="pi {{ icon() }}" aria-hidden="true"></i>
      {{ label() }}
    </a>
  `,
  styles: [
    `
      .topbar-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid var(--app-card-border);
        border-radius: 8px;
        background: #fff;
        color: #475569;
        font-size: 0.78rem;
        font-weight: 500;
        text-decoration: none;
      }
      .topbar-link:hover {
        background: var(--p-primary-50, #eef3fa);
        color: var(--app-navy);
      }
    `,
  ],
})
export class TopbarLinkComponent {
  /** Router commands array, e.g. `['/reports', id]`. */
  readonly link = input.required<unknown[]>();
  /** PrimeIcons class without the `pi` prefix, e.g. `pi-database`. */
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly title = input('');
}
