import { Component, inject } from '@angular/core';
import { ReadonlyReportGridComponent } from './readonly-report-grid/readonly-report-grid.component';
import { ReportViewerAsideComponent } from './report-viewer-aside/report-viewer-aside.component';
import { ReportViewerHeaderComponent } from './report-viewer-header/report-viewer-header.component';
import { ReportViewerStore } from './report-viewer.store';

/**
 * Read-only view of a report: the latest published version by default, or one
 * historical version when a version number is in the route. All state and data
 * live in {@link ReportViewerStore}; this shell only lays out the header, the
 * grid, and the filters/history aside around it.
 */
@Component({
  selector: 'app-report-viewer',
  imports: [ReadonlyReportGridComponent, ReportViewerHeaderComponent, ReportViewerAsideComponent],
  templateUrl: './report-viewer.component.html',
  styleUrl: './report-viewer.component.scss',
  providers: [ReportViewerStore],
})
export class ReportViewerComponent {
  private readonly store = inject(ReportViewerStore);

  protected readonly loading = this.store.loading;
  protected readonly notFound = this.store.notFound;
  protected readonly report = this.store.report;
  protected readonly content = this.store.content;
  protected readonly viewFilters = this.store.viewFilters;
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
