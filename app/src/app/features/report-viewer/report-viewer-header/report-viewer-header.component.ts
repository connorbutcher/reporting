import { Component, computed, inject, Signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ReportViewerStore } from '../report-viewer.store';

@Component({
  selector: 'app-report-viewer-header',
  imports: [ButtonModule],
  templateUrl: './report-viewer-header.component.html',
  styleUrl: './report-viewer-header.component.scss',
})
export class ReportViewerHeaderComponent {
  public readonly viewingVersion: Signal<number | null>;

  /** True while showing an older version than the latest published one. */
  public readonly isViewingHistorical = computed(() => {
    const report = this.store.report();
    const version = this.store.viewingVersion();
    return !!report && version !== null && version !== report.latestVersionNumber;
  });

  private readonly store = inject(ReportViewerStore);

  constructor() {
    this.viewingVersion = this.store.viewingVersion;
  }

  public viewLatest(): void {
    this.store.viewLatest();
  }

  public edit(version?: number): void {
    this.store.edit(version);
  }

  public get report() {
    return this.store.report;
  }
}
