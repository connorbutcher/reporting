import { Component, inject, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SaveStatusComponent } from '../../../shared/save-status/save-status.component';
import { DatasetIssuesComponent } from '../dataset-issues/dataset-issues.component';
import { ConfirmDialogComponent } from '../../home/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogData } from '../../home/confirm-dialog/confirm-dialog-data';
import { DatasetsStore } from '../datasets.store';

@Component({
  selector: 'app-dataset-toolbar',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SaveStatusComponent,
    DatasetIssuesComponent,
  ],
  templateUrl: './dataset-toolbar.component.html',
  styleUrl: './dataset-toolbar.component.scss',
})
export class DatasetToolbarComponent {
  public readonly saveFailed: WritableSignal<boolean>;

  private readonly store = inject(DatasetsStore);

  private readonly dialog = inject(Dialog);

  constructor() {
    this.saveFailed = this.store.saveFailed;
  }

  /**
   * Commits a rename, but restores the field when the name can't be saved — it was
   * cleared (a dataset must keep a name) or it duplicates another dataset. The
   * store's {@link DatasetsStore.renameDataset} enforces the same rules and raises
   * the duplicate-name notification; reverting here just keeps the field truthful.
   */
  public onNameBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const name = input.value.trim();
    const current = this.selected();
    if (!current) {
      return;
    }
    if (!name || this.store.datasetNameTaken(name)) {
      input.value = current.name;
    }
    this.store.renameDataset(name);
  }

  public cloneDataset(): void {
    this.store.cloneDataset();
  }

  /** Confirms before deleting the selected dataset, matching the app's other destructive actions. */
  public deleteDataset(): void {
    const dataset = this.selected();
    if (!dataset) {
      return;
    }
    this.dialog
      .open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Delete dataset',
          message: `Delete "${dataset.name}"? This removes its columns and data and can't be undone.`,
          confirmLabel: 'Delete',
          danger: true,
        } satisfies ConfirmDialogData,
      })
      .closed.subscribe((confirmed) => {
        if (confirmed) {
          this.store.deleteDataset();
        }
      });
  }

  public get selected() {
    return this.store.selected;
  }

  public get saving() {
    return this.store.saving;
  }
}
