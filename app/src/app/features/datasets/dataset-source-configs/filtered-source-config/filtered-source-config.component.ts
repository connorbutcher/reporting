import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, Signal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { FilterApiService } from '../../../../core/api/filter-api.service';
import { DatasetSchema } from '../../../../core/models/dataset';
import { OperatorCatalogue } from '../../../../core/models/filter';
import { FilterContext, FilterGroupModel } from '../../../report-builder/models/filter';
import { FilterBuilderComponent } from '../../../report-builder/side-panel/filter-builder/filter-builder.component';
import { DatasetsStore } from '../../datasets.store';

@Component({
  selector: 'app-filtered-source-config',
  imports: [FormsModule, SelectModule, FilterBuilderComponent],
  templateUrl: './filtered-source-config.component.html',
  styleUrl: './filtered-source-config.component.scss',
})
export class FilteredSourceConfigComponent {
  /** The config narrowed to filtered; null only during a brief source transition. */
  public readonly config = computed(() => {
    const config = this.store.sourceConfig();
    return config && config.source === 'filtered' ? config : null;
  });

  /** Other datasets on this report it could filter — never itself. */
  public readonly baseOptions = computed(() =>
    this.store.datasets().filter((d) => d.id !== this.store.selectedId()),
  );

  public readonly filterGroup: Signal<FilterGroupModel | null>;

  private readonly store = inject(DatasetsStore);

  private readonly baseDatasetId = computed(() => this.config()?.baseDatasetId ?? null);

  private readonly baseSchemaResource = httpResource<DatasetSchema>(() =>
    this.baseDatasetId() ? `/api/datasets/${this.baseDatasetId()}/schema` : undefined,
  );

  private readonly baseSchema = computed(() =>
    this.baseSchemaResource.hasValue() ? this.baseSchemaResource.value() : null,
  );

  private readonly catalogue = signal<OperatorCatalogue | null>(null);

  private readonly context: FilterContext = {
    schema: this.baseSchema,
    catalogue: this.catalogue,
    ownerId: `filtered-dataset:${this.store.selectedId() ?? 0}`,
  };

  // Rebuilt only when the base id changes, so edits keep their model. An effect because the
  // constructor writes signals (NG0600 in a computed).
  private readonly filterGroupSignal = signal<FilterGroupModel | null>(null);

  constructor() {
    this.filterGroup = this.filterGroupSignal.asReadonly();
    inject(FilterApiService)
      .operators()
      .pipe(takeUntilDestroyed())
      .subscribe((catalogue) => this.catalogue.set(catalogue));

    effect(() => {
      const baseId = this.baseDatasetId();
      if (!baseId) {
        this.filterGroupSignal.set(null);
        return;
      }
      // Read untracked: only a change of base id should rebuild the model, not every config echo.
      const config = untracked(() => this.config());
      this.filterGroupSignal.set(config ? new FilterGroupModel(config.filter, this.context) : null);
    });

    // Debounced so a burst of edits makes one request.
    toObservable(computed(() => this.filterGroup()?.toQueryDto() ?? null))
      .pipe(
        skip(1),
        debounceTime(500),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(),
      )
      .subscribe((filter) => {
        const config = this.config();
        if (!config) {
          return;
        }
        this.store.updateSourceConfig({ ...config, filter });
      });
  }

  /** Repoints the filter at a different base dataset. The filter resets — it named the old base's columns. */
  public setBaseDataset(baseDatasetId: number): void {
    const config = this.config();
    if (!config || baseDatasetId === config.baseDatasetId) {
      return;
    }
    this.store.updateSourceConfig({ ...config, baseDatasetId, filter: null });
  }

  public get baseSchemaLoading() {
    return this.baseSchemaResource.isLoading;
  }
}
