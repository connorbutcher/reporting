import { Component, computed, inject } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';

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
  private readonly store = inject(ReportBuilderStore);

  protected readonly name = computed(() => this.store.model()?.name() ?? 'Report');
}
