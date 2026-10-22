import { Component, computed, inject, input, Signal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { DatasetCreateDialogComponent } from '../dataset-create-dialog/dataset-create-dialog.component';
import { DatasetCreateDialogData } from '../dataset-create-dialog/dataset-create-dialog-data';
import { DatasetCreateDialogResult } from '../dataset-create-dialog/dataset-create-dialog-result';
import { DatasetsStore } from '../datasets.store';

@Component({
  selector: 'app-dataset-list',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, SkeletonModule],
  templateUrl: './dataset-list.component.html',
  styleUrl: './dataset-list.component.scss',
  host: { class: 'app-card' },
})
export class DatasetListComponent {
  /** The report we came from, for the "back to report" link. */
  public readonly reportId = input.required<number>();

  public readonly loading: Signal<boolean>;

  public readonly error: Signal<string | null>;

  /** Dataset ids that share a name with another, marked as invalid in the list. */
  public readonly nameConflictIds: Signal<Set<number>>;

  public readonly canCreate = computed(() => this.store.sources().length > 0);

  public readonly filter = signal('');

  public readonly filteredDatasets = computed(() => {
    const query = this.filter().trim().toLowerCase();
    const all = this.datasets();
    return query ? all.filter((d) => d.name.toLowerCase().includes(query)) : all;
  });

  private readonly store = inject(DatasetsStore);

  private readonly dialog = inject(Dialog);

  constructor() {
    this.loading = this.store.datasetsLoading;
    this.error = this.store.listError;
    this.nameConflictIds = this.store.nameConflictIds;
  }

  public select(id: number): void {
    this.store.select(id);
  }

  /** Opens the create dialog, then creates and selects the new dataset. */
  public openCreate(): void {
    this.dialog
      .open<DatasetCreateDialogResult | undefined>(DatasetCreateDialogComponent, {
        data: {
          sources: this.store.sources(),
          existingNames: this.store.datasets().map((d) => d.name),
        } satisfies DatasetCreateDialogData,
      })
      .closed.subscribe((result) => {
        if (result) {
          this.store.createDataset(result.name, result.sourceId);
        }
      });
  }

  public get datasets() {
    return this.store.datasets;
  }

  public get selectedId() {
    return this.store.selectedId;
  }
}
