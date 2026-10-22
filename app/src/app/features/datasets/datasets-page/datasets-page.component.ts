import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatasetEditorComponent } from '../dataset-editor/dataset-editor.component';
import { DatasetListComponent } from '../dataset-list/dataset-list.component';
import { DatasetRevisionCardComponent } from '../dataset-revision-card/dataset-revision-card.component';
import { DatasetsStore } from '../datasets.store';
import { DatasetAutosave } from '../state/dataset-autosave';
import { DatasetCollection } from '../state/dataset-collection';
import { DatasetColumnCommands } from '../state/dataset-column-commands';
import { DatasetColumnUsage } from '../state/dataset-column-usage';
import { DatasetExport } from '../state/dataset-export';
import { DatasetRowCommands } from '../state/dataset-row-commands';
import { DatasetRowWindow } from '../state/dataset-row-window';
import { DatasetSchemaState } from '../state/dataset-schema-state';
import { DatasetSourceCommands } from '../state/dataset-source-commands';
import { DatasetValidation } from '../state/dataset-validation';

@Component({
  selector: 'app-datasets-page',
  imports: [DatasetListComponent, DatasetEditorComponent, DatasetRevisionCardComponent],
  templateUrl: './datasets-page.component.html',
  styleUrl: './datasets-page.component.scss',
  // Provided here so the store's collaborators share one instance per report screen.
  providers: [
    DatasetAutosave,
    DatasetCollection,
    DatasetSchemaState,
    DatasetRowWindow,
    DatasetColumnCommands,
    DatasetColumnUsage,
    DatasetRowCommands,
    DatasetSourceCommands,
    DatasetExport,
    DatasetValidation,
    DatasetsStore,
  ],
})
export class DatasetsPageComponent {
  /** The report we came from, passed to the list for its "back to report" link. */
  public readonly reportId: number;

  private readonly store = inject(DatasetsStore);

  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.reportId = Number(this.route.snapshot.paramMap.get('reportId'));
    this.store.setReport(this.reportId);
  }
}
