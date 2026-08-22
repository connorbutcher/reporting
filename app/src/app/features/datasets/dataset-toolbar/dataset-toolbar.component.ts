import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SaveStatusComponent } from '../../../shared/save-status/save-status.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../home/confirm-dialog/confirm-dialog.component';
import { DatasetsStore } from '../datasets.store';

/**
 * The selected dataset's identity and actions — rename, save status, duplicate and delete.
 * Reads and mutates through {@link DatasetsStore}, which it never hands to the template.
 */
@Component({
  selector: 'app-dataset-toolbar',
  imports: [FormsModule, ButtonModule, InputTextModule, SaveStatusComponent],
  templateUrl: './dataset-toolbar.component.html',
  styleUrl: './dataset-toolbar.component.scss',
})
export class DatasetToolbarComponent {
  private readonly store = inject(DatasetsStore);
  private readonly dialog = inject(Dialog);

  protected readonly selected = this.store.selected;
  protected readonly saving = this.store.saving;
  protected readonly saveFailed = this.store.saveFailed;

  /** Commits a rename, but restores the field if it was cleared — a dataset must keep a name. */
  protected onNameBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const name = input.value.trim();
    const current = this.selected();
    if (!name) {
      if (current) input.value = current.name;
      return;
    }
    this.store.renameDataset(name);
  }

  protected cloneDataset(): void {
    this.store.cloneDataset();
  }

  /** Confirms before deleting the selected dataset, matching the app's other destructive actions. */
  protected deleteDataset(): void {
    const dataset = this.selected();
    if (!dataset) return;
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
        if (confirmed) this.store.deleteDataset();
      });
  }
}
