import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatasetEditorComponent } from '../dataset-editor/dataset-editor.component';
import { DatasetListComponent } from '../dataset-list/dataset-list.component';
import { DatasetsStore } from '../datasets.store';
import { DatasetAutosave } from '../state/dataset-autosave';
import { DatasetCollection } from '../state/dataset-collection';
import { DatasetColumnCommands } from '../state/dataset-column-commands';
import { DatasetExport } from '../state/dataset-export';
import { DatasetRowCommands } from '../state/dataset-row-commands';
import { DatasetRowWindow } from '../state/dataset-row-window';
import { DatasetSchemaState } from '../state/dataset-schema-state';
import { DatasetSourceCommands } from '../state/dataset-source-commands';

/**
 * The datasets screen for one report's draft: the dataset list on the left, the
 * selected one's editor on the right. Reached from the report builder; the
 * `reportId` route param scopes the store to that report's draft. Provides the
 * store so the list and editor (and its panels) share one instance.
 */
@Component({
  selector: 'app-datasets-page',
  imports: [DatasetListComponent, DatasetEditorComponent],
  templateUrl: './datasets-page.component.html',
  styleUrl: './datasets-page.component.scss',
  // The store is a thin facade over these focused collaborator services; all are
  // provided here so they share one component-scoped instance per report screen.
  providers: [
    DatasetAutosave,
    DatasetCollection,
    DatasetSchemaState,
    DatasetRowWindow,
    DatasetColumnCommands,
    DatasetRowCommands,
    DatasetSourceCommands,
    DatasetExport,
    DatasetsStore,
  ],
})
export class DatasetsPageComponent {
  private readonly store = inject(DatasetsStore);
  private readonly route = inject(ActivatedRoute);

  /** The report we came from, passed to the list for its "back to report" link. */
  protected readonly reportId = Number(this.route.snapshot.paramMap.get('reportId'));

  constructor() {
    this.store.setReport(this.reportId);
  }
}
