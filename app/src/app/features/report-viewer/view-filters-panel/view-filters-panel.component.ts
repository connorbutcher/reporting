import { Component, computed, input, model, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageFilterEntry } from '../filters/view-filter-entry';
import { ReportViewFilters } from '../filters/report-view-filters';
import { SharedLinkState } from '../filters/shared-link-state';
import { ViewWidgetFilters } from '../filters/view-widget-filters';
import { PageFilterRowComponent } from './page-filter-row/page-filter-row.component';
import { SharedLinkBannerComponent } from './shared-link-banner/shared-link-banner.component';
import { WidgetFilterRowComponent } from './widget-filter-row/widget-filter-row.component';

interface TabWidgets {
  readonly tabName: string;
  readonly items: readonly ViewWidgetFilters[];
}

/** The viewer's filter panel: the page filters, then each widget's, grouped by tab. */
@Component({
  selector: 'app-view-filters-panel',
  imports: [ButtonModule, PageFilterRowComponent, WidgetFilterRowComponent, SharedLinkBannerComponent],
  templateUrl: './view-filters-panel.component.html',
  styleUrl: './view-filters-panel.component.scss',
})
export class ViewFiltersPanelComponent {
  public readonly filters = input.required<ReportViewFilters>();
  public readonly sharedLink = input<SharedLinkState | null>(null);

  /**
   * The expanded widget: its id, or a single-filter widget's entry key. Two-way so a widget's filter
   * button on the grid can open it. Independent of the page rows' open state, so jumping to a widget
   * doesn't collapse a page filter.
   */
  public readonly openKey = model<string | null>(null);

  public readonly copyLink = output<void>();
  public readonly saveLink = output<void>();
  public readonly discardLink = output<void>();

  public readonly pageEntries = computed(() => this.filters().pageEntries);

  /** Widgets grouped by tab, in tab order. */
  public readonly tabWidgets = computed<TabWidgets[]>(() => {
    const byTab = new Map<string, ViewWidgetFilters[]>();
    for (const item of this.filters().widgetItems) {
      const items = byTab.get(item.widget.tabName);
      if (items) items.push(item);
      else byTab.set(item.widget.tabName, [item]);
    }
    return [...byTab].map(([tabName, items]) => ({ tabName, items }));
  });

  private readonly pageOpenKey = signal<string | null>(null);

  public isPageOpen(entry: PageFilterEntry): boolean {
    return this.pageOpenKey() === entry.key;
  }

  public togglePage(entry: PageFilterEntry): void {
    this.pageOpenKey.update((key) => (key === entry.key ? null : entry.key));
  }

  public isWidgetOpen(item: ViewWidgetFilters): boolean {
    const open = this.openKey();
    return open !== null && (open === item.widget.id || item.entries.some((e) => e.key === open));
  }

  public toggleWidget(item: ViewWidgetFilters): void {
    this.openKey.set(this.isWidgetOpen(item) ? null : item.widget.id);
  }
}
