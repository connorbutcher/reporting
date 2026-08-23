import { Component, inject } from '@angular/core';
import { DatasetColumnsPanelComponent } from '../dataset-columns-panel/dataset-columns-panel.component';
import { DatasetRowsPanelComponent } from '../dataset-rows-panel/dataset-rows-panel.component';
import { DatasetSourcePanelComponent } from '../dataset-source-panel/dataset-source-panel.component';
import { DatasetToolbarComponent } from '../dataset-toolbar/dataset-toolbar.component';
import { DatasetsStore } from '../datasets.store';

/**
 * The editor for the selected dataset: its toolbar plus the source, columns and rows panels. A thin
 * container — each child owns its own concern and reads the shared {@link DatasetsStore} itself.
 */
@Component({
  selector: 'app-dataset-editor',
  imports: [
    DatasetToolbarComponent,
    DatasetSourcePanelComponent,
    DatasetColumnsPanelComponent,
    DatasetRowsPanelComponent,
  ],
  templateUrl: './dataset-editor.component.html',
  styleUrl: './dataset-editor.component.scss',
  host: { class: 'app-card' },
})
export class DatasetEditorComponent {
  private readonly store = inject(DatasetsStore);

  protected readonly selected = this.store.selected;
  protected readonly error = this.store.error;
}
