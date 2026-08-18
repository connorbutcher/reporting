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
  protected readonly store = inject(ReportViewerStore);
}
