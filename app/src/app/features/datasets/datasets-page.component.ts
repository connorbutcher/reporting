import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatasetEditorComponent } from './dataset-editor.component';
import { DatasetsStore } from './datasets.store';

/** The datasets screen: a list of datasets on the left, the selected one's editor on the right. */
@Component({
  selector: 'app-datasets-page',
  imports: [FormsModule, ButtonModule, InputTextModule, DatasetEditorComponent],
  templateUrl: './datasets-page.component.html',
  styleUrl: './datasets-page.component.scss',
  providers: [DatasetsStore],
})
export class DatasetsPageComponent {
  protected readonly store = inject(DatasetsStore);

  protected readonly newDatasetName = signal('');

  protected createDataset(): void {
    const name = this.newDatasetName().trim();
    if (!name) return;
    this.store.createDataset(name);
    this.newDatasetName.set('');
  }
}
