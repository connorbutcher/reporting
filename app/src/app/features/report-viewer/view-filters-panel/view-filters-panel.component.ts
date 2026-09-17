import { Component, computed, input, model, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FilterGroup } from '../../../core/models/filter';
import { FilterBuilderComponent } from '../../report-builder/side-panel/filter-builder/filter-builder.component';
import { ReportViewFilters, ViewFilterEntry, entryChanged } from '../report-view-filters';

/** One tab's worth of widget-filter entries, for the panel's grouped widget list. */
interface WidgetFilterGroup {
  readonly tabName: string;
  readonly entries: readonly ViewFilterEntry[];
}

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
  public readonly filters = input.required<ReportViewFilters>();

  /**
   * Which widget entry is expanded; only one at a time keeps the narrow panel readable.
   * Two-way so clicking a widget's filter button on the grid can open its entry. Kept
   * independent of the page section's own open state (below) so jumping to a widget's
   * filter doesn't collapse a page filter the reader already had open.
   */
  public readonly openKey = model<string | null>(null);

  public readonly pageEntries = computed(() => this.filters().pageEntries);

  /** Widget entries grouped by the tab they're on, in tab order — a long widget list
   * otherwise reads as one undifferentiated stack once a report has more than a tab's worth. */
  public readonly widgetGroups = computed<WidgetFilterGroup[]>(() => {
    const groups: WidgetFilterGroup[] = [];
    const byTabName = new Map<string, ViewFilterEntry[]>();
    for (const entry of this.filters().widgetEntries) {
      const tabName = entry.tabName ?? '';
      let entries = byTabName.get(tabName);
      if (!entries) {
        entries = [];
        byTabName.set(tabName, entries);
        groups.push({ tabName, entries });
      }
      entries.push(entry);
    }
    return groups;
  });

  /** Which page entry is expanded, independent of the widget section's own open state. */
  private readonly pageOpenKey = signal<string | null>(null);

  public isPageOpen(entry: ViewFilterEntry): boolean {
    return this.pageOpenKey() === entry.key;
  }

  public togglePage(entry: ViewFilterEntry): void {
    this.pageOpenKey.update((key) => (key === entry.key ? null : entry.key));
  }

  public isWidgetOpen(entry: ViewFilterEntry): boolean {
    const open = this.openKey();
    if (open === null) return false;
    // A chart's filter button focuses the widget by its bare id, which opens every
    // binding entry (keyed `<widgetId>::<bindingId>`); a table entry matches exactly.
    return open === entry.key || entry.key.startsWith(`${open}::`);
  }

  public toggleWidget(entry: ViewFilterEntry): void {
    this.openKey.update((key) => (key === entry.key ? null : entry.key));
  }

  /** The report-level filter already layered on top of a widget entry, for its live count. */
  public additionalFilterFor(entry: ViewFilterEntry): FilterGroup | null {
    return this.filters().pageFilterFor(entry);
  }

  public summary(entry: ViewFilterEntry): string {
    const total = entry.group.count();
    if (total === 0) return 'No conditions';

    // When some are switched off, spell out how many are actually narrowing the
    // data — that's the number the reader cares about.
    const active = entry.group.enabledCount();
    if (active < total) return `${active} of ${total} active`;
    return `${total} condition${total > 1 ? 's' : ''}`;
  }

  /** Marks entries the reader has changed away from what was published. */
  public isChanged(entry: ViewFilterEntry): boolean {
    return entryChanged(entry);
  }
}
