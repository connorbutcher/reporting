import { Component, computed, inject } from '@angular/core';
import { ReadonlyReportGridComponent } from './readonly-report-grid/readonly-report-grid.component';
import { ReportViewerAsideComponent } from './report-viewer-aside/report-viewer-aside.component';
import { ReportViewerHeaderComponent } from './report-viewer-header/report-viewer-header.component';
import { ReportViewerStore } from './report-viewer.store';
import { SavedViewFilters } from './filters/saved-view-filters';
import { SharedViewLink } from './filters/shared-view-link';
import { ViewFilterSchemas } from './filters/view-filter-schemas';
import { ViewFilterSession } from './filters/view-filter-session';

/** Read-only view of a report: lays out the header, the grid, and the filters/history aside. */
@Component({
  selector: 'app-report-viewer',
  imports: [ReadonlyReportGridComponent, ReportViewerHeaderComponent, ReportViewerAsideComponent],
  templateUrl: './report-viewer.component.html',
  styleUrl: './report-viewer.component.scss',
  providers: [ReportViewerStore, ViewFilterSchemas, SavedViewFilters, SharedViewLink, ViewFilterSession],
})
export class ReportViewerComponent {
  private readonly store = inject(ReportViewerStore);
  private readonly filters = inject(ViewFilterSession);

  protected readonly loading = computed(() => this.store.loading() || this.filters.loading());
  protected readonly notFound = this.store.notFound;
  protected readonly report = this.store.report;
  protected readonly content = this.store.content;
  protected readonly viewFilters = this.filters.viewFilters;
  protected readonly tabs = this.store.tabs;
  protected readonly activeTab = this.store.activeTab;
  protected readonly activeTabId = this.store.activeTabId;

  protected filterWidget(widgetId: string): void {
    this.store.filterWidget(widgetId);
  }

  protected selectTab(tabId: string): void {
    this.store.selectTab(tabId);
  }
}
