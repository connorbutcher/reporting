import { Component, computed, input, model } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FilterBuilderComponent } from '../../report-builder/side-panel/filter-builder/filter-builder.component';
import { ReportViewFilters, ViewFilterEntry, entryChanged } from '../report-view-filters';

/**
 * The viewer's filter panel: the page filters the author defined plus each
 * widget's own (table or chart), all adjustable for this session only.
 */
@Component({
  selector: 'app-view-filters-panel',
  imports: [ButtonModule, FilterBuilderComponent],
  templateUrl: './view-filters-panel.component.html',
  styleUrl: './view-filters-panel.component.scss',
})
export class ViewFiltersPanelComponent {
  readonly filters = input.required<ReportViewFilters>();

  /**
   * Which entry is expanded; only one at a time keeps the narrow panel readable.
   * Two-way so clicking a widget's filter button on the grid can open its entry.
   */
  readonly openKey = model<string | null>(null);

  protected readonly pageEntries = computed(() => this.filters().pageEntries);
  protected readonly widgetEntries = computed(() => this.filters().widgetEntries);

  protected isOpen(entry: ViewFilterEntry): boolean {
    const open = this.openKey();
    if (open === null) return false;
    // A chart's filter button focuses the widget by its bare id, which opens every
    // binding entry (keyed `<widgetId>::<bindingId>`); a table entry matches exactly.
    return open === entry.key || entry.key.startsWith(`${open}::`);
  }

  protected toggle(entry: ViewFilterEntry): void {
    this.openKey.update((key) => (key === entry.key ? null : entry.key));
  }

  protected summary(entry: ViewFilterEntry): string {
    const total = entry.group.count();
    if (total === 0) return 'No conditions';

    // When some are switched off, spell out how many are actually narrowing the
    // data — that's the number the reader cares about.
    const active = entry.group.enabledCount();
    if (active < total) return `${active} of ${total} active`;
    return `${total} condition${total > 1 ? 's' : ''}`;
  }

  /** Marks entries the reader has changed away from what was published. */
  protected isChanged(entry: ViewFilterEntry): boolean {
    return entryChanged(entry);
  }
}
