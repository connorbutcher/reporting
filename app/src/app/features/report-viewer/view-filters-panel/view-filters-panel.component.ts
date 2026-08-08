import { Component, computed, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FilterBuilderComponent } from '../../report-builder/side-panel/filter-builder/filter-builder.component';
import { ReportViewFilters, ViewFilterEntry, entryChanged } from '../report-view-filters';

/**
 * The viewer's filter panel: the page filters the author defined plus each
 * table's own, all adjustable for this session only.
 */
@Component({
  selector: 'app-view-filters-panel',
  imports: [ButtonModule, FilterBuilderComponent],
  templateUrl: './view-filters-panel.component.html',
  styleUrl: './view-filters-panel.component.scss',
})
export class ViewFiltersPanelComponent {
  readonly filters = input.required<ReportViewFilters>();

  /** Which entry is expanded; only one at a time keeps the narrow panel readable. */
  private readonly openKey = signal<string | null>(null);

  protected readonly pageEntries = computed(() => this.filters().pageEntries);
  protected readonly widgetEntries = computed(() => this.filters().widgetEntries);

  protected isOpen(entry: ViewFilterEntry): boolean {
    return this.openKey() === entry.key;
  }

  protected toggle(entry: ViewFilterEntry): void {
    this.openKey.update((key) => (key === entry.key ? null : entry.key));
  }

  protected summary(entry: ViewFilterEntry): string {
    const count = entry.group.count();
    return count === 0 ? 'No conditions' : `${count} condition${count > 1 ? 's' : ''}`;
  }

  /** Marks entries the reader has changed away from what was published. */
  protected isChanged(entry: ViewFilterEntry): boolean {
    return entryChanged(entry);
  }
}
