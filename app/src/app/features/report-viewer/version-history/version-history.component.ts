import { ReportSummary } from '../../../core/models/report';
import { DatePipe } from '@angular/common';
import { Component, inject, Signal } from '@angular/core';
import { ReportViewerStore } from '../report-viewer.store';

@Component({
  selector: 'app-version-history',
  imports: [DatePipe],
  templateUrl: './version-history.component.html',
  styleUrl: './version-history.component.scss',
})
export class VersionHistoryComponent {
  public readonly report: Signal<ReportSummary | null>;

  private readonly store = inject(ReportViewerStore);

  constructor() {
    this.report = this.store.report;
  }

  public viewVersion(versionNumber: number): void {
    this.store.viewVersion(versionNumber);
  }

  /** Plain-text summary for the compact list, stripped of the notes' HTML. */
  public previewText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').trim();
  }

  public get versions() {
    return this.store.versions;
  }

  public get viewingVersion() {
    return this.store.viewingVersion;
  }
}
