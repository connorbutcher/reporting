import { Tab } from '../../core/models/report';
import { Component, computed, inject, Signal } from '@angular/core';
import { ReportComments } from './comments/report-comments';
import { ReadonlyReportGridComponent } from './readonly-report-grid/readonly-report-grid.component';
import { ReportViewerAsideComponent } from './report-viewer-aside/report-viewer-aside.component';
import { ReportViewerHeaderComponent } from './report-viewer-header/report-viewer-header.component';
import { ReportViewerStore } from './report-viewer.store';
import { SavedViewFilters } from './filters/saved-view-filters';
import { SharedViewLink } from './filters/shared-view-link';
import { ViewFilterSchemas } from './filters/view-filter-schemas';
import { ViewFilterSession } from './filters/view-filter-session';

@Component({
  selector: 'app-report-viewer',
  imports: [ReadonlyReportGridComponent, ReportViewerHeaderComponent, ReportViewerAsideComponent],
  templateUrl: './report-viewer.component.html',
  styleUrl: './report-viewer.component.scss',
  providers: [
    ReportViewerStore,
    ViewFilterSchemas,
    SavedViewFilters,
    SharedViewLink,
    ViewFilterSession,
    ReportComments,
  ],
})
export class ReportViewerComponent {
  public readonly loading = computed(() => this.store.loading() || this.filters.loading());

  public readonly tabs: Signal<Tab[]>;

  public readonly activeTab: Signal<Tab>;

  public readonly activeTabId: Signal<string | null>;

  private readonly store = inject(ReportViewerStore);

  private readonly filters = inject(ViewFilterSession);

  constructor() {
    this.tabs = this.store.tabs;
    this.activeTab = this.store.activeTab;
    this.activeTabId = this.store.activeTabId;
  }

  public filterWidget(widgetId: string): void {
    this.store.filterWidget(widgetId);
  }

  public openComments(widgetId: string): void {
    this.store.openComments(widgetId);
  }

  public selectTab(tabId: string): void {
    this.store.selectTab(tabId);
  }

  public get notFound() {
    return this.store.notFound;
  }

  public get report() {
    return this.store.report;
  }

  public get content() {
    return this.store.content;
  }

  public get viewFilters() {
    return this.filters.viewFilters;
  }
}
