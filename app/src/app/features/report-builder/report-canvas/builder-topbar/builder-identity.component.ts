import { Component, computed, inject } from '@angular/core';
import { ReportSession } from '../../state/report-session';

/** The name of the report being edited. */
@Component({
  selector: 'app-builder-identity',
  template: `<h1 class="name">{{ name() }}</h1>`,
  styles: [
    `
      .name {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.2;
        color: var(--app-navy);
      }
    `,
  ],
})
export class BuilderIdentityComponent {
  private readonly session = inject(ReportSession);

  protected readonly name = computed(() => this.session.model()?.name() ?? 'Report');
}
