import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgComponentOutlet } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { DatasetsStore } from '../datasets.store';
import { SOURCE_CONFIG_COMPONENTS } from '../dataset-source-configs/source-config.registry';

/**
 * The selected dataset's source system, plus its configuration — rendered by swapping in the
 * isolated config component the source maps to (see {@link SOURCE_CONFIG_COMPONENTS}), so changing
 * the source loads a completely different editor. Reads and mutates through {@link DatasetsStore},
 * which it never hands to the template.
 */
@Component({
  selector: 'app-dataset-source-panel',
  imports: [FormsModule, SelectModule, NgComponentOutlet],
  templateUrl: './dataset-source-panel.component.html',
  styleUrl: './dataset-source-panel.component.scss',
})
export class DatasetSourcePanelComponent {
  private readonly store = inject(DatasetsStore);

  protected readonly sources = this.store.sources;
  protected readonly sourceId = this.store.sourceId;

  /** The config editor for the current source, swapped whenever the source changes. */
  protected readonly configComponent = computed(() => {
    const config = this.store.sourceConfig();
    return config ? SOURCE_CONFIG_COMPONENTS[config.source] : null;
  });

  protected setSource(sourceId: number): void {
    this.store.setSource(sourceId);
  }
}
