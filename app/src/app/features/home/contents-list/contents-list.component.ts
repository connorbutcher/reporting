import { DatePipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { ReportOpenOption, ReportSummary, reportOpenOptions } from '../../../core/models/report';
import { ContentRow, ReportRow, RowAction } from '../content-row';
import { HomeStore } from '../home.store';

/**
 * The current folder's contents as one light list: child folders first, then reports. A report row
 * shows its full state at a glance — a "Published · vN" badge and a "Draft" badge appear together
 * when both exist — and offers its real open methods (Open / Edit) inline rather than hiding them in
 * a menu. Right-click (or the ⋯ button) still raises the shared context menu for rename/move/etc.
 */
@Component({
  selector: 'app-contents-list',
  imports: [DatePipe],
  templateUrl: './contents-list.component.html',
  styleUrl: './contents-list.component.scss',
})
export class ContentsListComponent {
  protected readonly store = inject(HomeStore);
  private readonly router = inject(Router);

  /** A right-click / ⋯ click bubbles up to the shell, which owns the shared context-menu overlay. */
  readonly rowAction = output<RowAction>();

  protected openOptions(report: ReportSummary): ReportOpenOption[] {
    return reportOpenOptions(report);
  }

  /** Quiet version context for the meta line — published-vN is the normal state, so it lives here rather than in a pill. */
  protected publishedLabel(report: ReportSummary): string {
    return report.latestVersionNumber != null
      ? `Published v${report.latestVersionNumber}`
      : 'Not yet published';
  }

  /** Draft pill wording: an edit to an already-published report is a next-version draft; otherwise it's the report's first, unpublished draft. */
  protected draftLabel(report: ReportSummary): string {
    return report.latestVersionNumber != null ? 'Draft in progress' : 'Draft';
  }

  /** Compact button text: the view option becomes "Open"; the edit option keeps its draft-aware label. */
  protected shortLabel(option: ReportOpenOption): string {
    return option.kind === 'view' ? 'Open' : option.label;
  }

  protected openOption(event: Event, option: ReportOpenOption): void {
    event.stopPropagation();
    this.router.navigate(option.route);
  }

  protected toggleFavorite(event: Event, row: ReportRow): void {
    event.stopPropagation();
    this.store.toggleFavorite(row.report);
  }

  protected onContextMenu(event: MouseEvent, row: ContentRow): void {
    event.preventDefault();
    this.rowAction.emit({ event, row });
  }

  protected onActions(event: MouseEvent, row: ContentRow): void {
    event.stopPropagation();
    this.rowAction.emit({ event, row });
  }
}
