import { SharedLinkState } from '../filters/shared-link-state';
import { Component, inject, Signal, WritableSignal } from '@angular/core';
import { ReportViewerStore } from '../report-viewer.store';
import { AsideTab } from '../aside-tab';
import { CommentsPanelComponent } from '../comments/comments-panel/comments-panel.component';
import { ReportComments } from '../comments/report-comments';
import { ViewFilterSession } from '../filters/view-filter-session';
import { VersionHistoryComponent } from '../version-history/version-history.component';
import { ViewFiltersPanelComponent } from '../view-filters-panel/view-filters-panel.component';

@Component({
  selector: 'app-report-viewer-aside',
  imports: [ViewFiltersPanelComponent, VersionHistoryComponent, CommentsPanelComponent],
  templateUrl: './report-viewer-aside.component.html',
  styleUrl: './report-viewer-aside.component.scss',
})
export class ReportViewerAsideComponent {
  public readonly sharedLink: Signal<SharedLinkState | null>;

  /** Two-way bound by the filters panel. */
  public readonly openFilterKey: WritableSignal<string | null>;

  public readonly commentCount: Signal<number>;

  private readonly store = inject(ReportViewerStore);

  private readonly filters = inject(ViewFilterSession);

  private readonly comments = inject(ReportComments);

  constructor() {
    this.sharedLink = this.filters.sharedLink;
    this.openFilterKey = this.store.openFilterKey;
    this.commentCount = this.comments.totalCount;
  }

  public showTab(tab: AsideTab): void {
    this.store.showTab(tab);
  }

  public copyLink(): void {
    void this.filters.copyLink();
  }

  public saveLinkAsMine(): void {
    this.filters.saveLinkAsMine();
  }

  public discardLink(): void {
    this.filters.discardLink();
  }

  public get asideTab() {
    return this.store.asideTab;
  }

  public get viewFilters() {
    return this.filters.viewFilters;
  }
}
