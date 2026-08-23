import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import {
  DatasetCreateDialogComponent,
  DatasetCreateDialogData,
  DatasetCreateDialogResult,
} from '../dataset-create-dialog/dataset-create-dialog.component';
import { DatasetsStore } from '../datasets.store';

/** The dataset list sidebar: browse, search and select a dataset, or create a new one. */
@Component({
  selector: 'app-dataset-list',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, SkeletonModule],
  templateUrl: './dataset-list.component.html',
  styleUrl: './dataset-list.component.scss',
  host: { class: 'app-card' },
})
export class DatasetListComponent {
  private readonly store = inject(DatasetsStore);
  private readonly dialog = inject(Dialog);

  /** The report we came from, for the "back to report" link. */
  readonly reportId = input.required<number>();

  protected readonly datasets = this.store.datasets;
  protected readonly selectedId = this.store.selectedId;
  protected readonly loading = this.store.datasetsLoading;
  protected readonly error = this.store.listError;
  protected readonly canCreate = computed(() => this.store.sources().length > 0);

  protected readonly filter = signal('');
  protected readonly filteredDatasets = computed(() => {
    const query = this.filter().trim().toLowerCase();
    const all = this.datasets();
    return query ? all.filter((d) => d.name.toLowerCase().includes(query)) : all;
  });

  protected select(id: number): void {
    this.store.select(id);
  }

  /** Opens the create dialog, then creates and selects the new dataset. */
  protected openCreate(): void {
    this.dialog
      .open<DatasetCreateDialogResult | undefined>(DatasetCreateDialogComponent, {
        data: { sources: this.store.sources() } satisfies DatasetCreateDialogData,
      })
      .closed.subscribe((result) => {
        if (result) this.store.createDataset(result.name, result.sourceId);
      });
  }
}
