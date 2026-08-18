import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReportViewerStore } from '../report-viewer.store';

/**
 * The compact list of published versions in the aside's History tab. Clicking
 * one navigates the viewer to it; the active version shows its full notes.
 */
@Component({
  selector: 'app-version-history',
  imports: [DatePipe],
  templateUrl: './version-history.component.html',
  styleUrl: './version-history.component.scss',
})
export class VersionHistoryComponent {
  protected readonly store = inject(ReportViewerStore);

  /** Plain-text summary for the compact list, stripped of the notes' HTML. */
  protected previewText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').trim();
  }
}
