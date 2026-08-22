import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatasetEditorComponent } from './dataset-editor.component';
import { DatasetsStore } from './datasets.store';

/**
 * The datasets screen for one report's draft: a list of datasets on the left,
 * the selected one's editor on the right. Reached from the report builder; the
 * `reportId` route param scopes the store to that report's draft.
 */
@Component({
  selector: 'app-datasets-page',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, DatasetEditorComponent],
  templateUrl: './datasets-page.component.html',
  styleUrl: './datasets-page.component.scss',
  providers: [DatasetsStore],
})
export class DatasetsPageComponent {
  protected readonly store = inject(DatasetsStore);
  private readonly route = inject(ActivatedRoute);

  /** The report we came from, for the "back to report" link. */
  protected readonly reportId = Number(this.route.snapshot.paramMap.get('reportId'));

  protected readonly newDatasetName = signal('');

  constructor() {
    this.store.setReport(this.reportId);
  }

  protected createDataset(): void {
    const name = this.newDatasetName().trim();
    if (!name) return;
    this.store.createDataset(name);
    this.newDatasetName.set('');
  }
}
