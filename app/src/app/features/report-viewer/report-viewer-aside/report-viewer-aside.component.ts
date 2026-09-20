import { Component, inject } from '@angular/core';
import { ReportViewerStore } from '../report-viewer.store';
import { ViewFilterSession } from '../filters/view-filter-session';
import { VersionHistoryComponent } from '../version-history/version-history.component';
import { ViewFiltersPanelComponent } from '../view-filters-panel/view-filters-panel.component';

type AsideTab = 'filters' | 'history';

/** The viewer's secondary pane: tabs over the filter panel and the version history. */
@Component({
  selector: 'app-report-viewer-aside',
  imports: [ViewFiltersPanelComponent, VersionHistoryComponent],
  templateUrl: './report-viewer-aside.component.html',
  styleUrl: './report-viewer-aside.component.scss',
})
export class ReportViewerAsideComponent {
  private readonly store = inject(ReportViewerStore);
  private readonly filters = inject(ViewFilterSession);

  protected readonly asideTab = this.store.asideTab;
  protected readonly viewFilters = this.filters.viewFilters;
  protected readonly sharedLink = this.filters.sharedLink;
  /** Two-way bound by the filters panel. */
  protected readonly openFilterKey = this.store.openFilterKey;

  protected showTab(tab: AsideTab): void {
    this.store.showTab(tab);
  }

  protected copyLink(): void {
    void this.filters.copyLink();
  }

  protected saveLinkAsMine(): void {
    this.filters.saveLinkAsMine();
  }

  protected discardLink(): void {
    this.filters.discardLink();
  }
}
