import { Component, inject } from '@angular/core';
import { ReportViewerStore } from '../report-viewer.store';
import { VersionHistoryComponent } from '../version-history/version-history.component';
import { ViewFiltersPanelComponent } from '../view-filters-panel/view-filters-panel.component';

type AsideTab = 'filters' | 'history';

/**
 * The viewer's secondary pane: a two-tab shell over the session filter panel
 * and the version history list.
 */
@Component({
  selector: 'app-report-viewer-aside',
  imports: [ViewFiltersPanelComponent, VersionHistoryComponent],
  templateUrl: './report-viewer-aside.component.html',
  styleUrl: './report-viewer-aside.component.scss',
})
export class ReportViewerAsideComponent {
  private readonly store = inject(ReportViewerStore);

  protected readonly asideTab = this.store.asideTab;
  protected readonly viewFilters = this.store.viewFilters;
  /** Two-way bound by the filters panel; the same writable signal the store owns. */
  protected readonly openFilterKey = this.store.openFilterKey;

  protected showTab(tab: AsideTab): void {
    this.store.showTab(tab);
  }
}
