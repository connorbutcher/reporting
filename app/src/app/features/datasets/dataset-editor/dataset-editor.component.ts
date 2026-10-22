import { Component, inject, Signal } from '@angular/core';
import { DatasetColumnsPanelComponent } from '../dataset-columns-panel/dataset-columns-panel.component';
import { DatasetRowsPanelComponent } from '../dataset-rows-panel/dataset-rows-panel.component';
import { DatasetSourcePanelComponent } from '../dataset-source-panel/dataset-source-panel.component';
import { DatasetToolbarComponent } from '../dataset-toolbar/dataset-toolbar.component';
import { DatasetsStore } from '../datasets.store';

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
  public readonly error: Signal<string | null>;

  private readonly store = inject(DatasetsStore);

  constructor() {
    this.error = this.store.error;
  }

  public get selected() {
    return this.store.selected;
  }
}
