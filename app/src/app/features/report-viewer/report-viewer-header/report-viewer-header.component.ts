import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ReportViewerStore } from '../report-viewer.store';

/**
 * The viewer's title bar: report name and number, which version is on screen,
 * and the button that leads into editing — continue a draft, check out a fresh
 * one, or restore the historical version being viewed.
 */
@Component({
  selector: 'app-report-viewer-header',
  imports: [ButtonModule],
  templateUrl: './report-viewer-header.component.html',
  styleUrl: './report-viewer-header.component.scss',
})
export class ReportViewerHeaderComponent {
  protected readonly store = inject(ReportViewerStore);

  /** True while showing an older version than the latest published one. */
  protected readonly isViewingHistorical = computed(() => {
    const report = this.store.report();
    const version = this.store.viewingVersion();
    return !!report && version !== null && version !== report.latestVersionNumber;
  });
}
