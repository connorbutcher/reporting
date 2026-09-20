import { Component, input, output } from '@angular/core';
import { FilterBuilderComponent } from '../../../report-builder/side-panel/filter-builder/filter-builder.component';
import { PageFilterEntry } from '../../filters/view-filter-entry';
import { FilterRowHeaderComponent } from '../filter-row-header/filter-row-header.component';

/** A dataset's page-level filter. */
@Component({
  selector: 'app-page-filter-row',
  imports: [FilterRowHeaderComponent, FilterBuilderComponent],
  template: `
    <app-filter-row-header
      icon="pi pi-database"
      [label]="entry().label()"
      [summary]="entry().summary()"
      [changed]="entry().changed()"
      [open]="open()"
      (toggle)="toggle.emit()"
    />
    @if (open()) {
      <div class="builder">
        <app-filter-builder [group]="entry().group" />
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
    }

    .builder {
      padding: 8px 4px 4px;
    }
  `,
})
export class PageFilterRowComponent {
  public readonly entry = input.required<PageFilterEntry>();
  public readonly open = input(false);
  public readonly toggle = output<void>();
}
