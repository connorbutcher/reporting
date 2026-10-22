import { Component, computed, inject, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgComponentOutlet } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { DatasetsStore } from '../datasets.store';
import { SourceConfigRegistry } from '../dataset-source-configs/source-config-registry';

@Component({
  selector: 'app-dataset-source-panel',
  imports: [FormsModule, SelectModule, NgComponentOutlet],
  templateUrl: './dataset-source-panel.component.html',
  styleUrl: './dataset-source-panel.component.scss',
})
export class DatasetSourcePanelComponent {
  public readonly sourceId: WritableSignal<number | null>;

  /** The config editor for the current source, swapped whenever the source changes. */
  public readonly configComponent = computed(() => {
    const config = this.store.sourceConfig();
    return config ? SourceConfigRegistry.COMPONENTS[config.source] : null;
  });

  private readonly store = inject(DatasetsStore);

  constructor() {
    this.sourceId = this.store.sourceId;
  }

  public setSource(sourceId: number): void {
    this.store.setSource(sourceId);
  }

  public get sources() {
    return this.store.sources;
  }
}
