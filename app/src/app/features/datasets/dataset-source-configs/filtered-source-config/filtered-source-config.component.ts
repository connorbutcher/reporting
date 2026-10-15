import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
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

/**
 * Configuration editor for a filtered dataset: which dataset it draws rows from, and the filter
 * applied to it — built with the same filter builder a report's own filters use, scoped to the
 * chosen base dataset's schema rather than a report/widget. Edits save a short debounce after the
 * last change, the same way a burst of typing settles into one request for the live match count.
 */
@Component({
  selector: 'app-filtered-source-config',
  imports: [FormsModule, SelectModule, FilterBuilderComponent],
  templateUrl: './filtered-source-config.component.html',
  styleUrl: './filtered-source-config.component.scss',
})
export class FilteredSourceConfigComponent {
  private readonly store = inject(DatasetsStore);

  /** The config narrowed to filtered; null only during a brief source transition. */
  protected readonly config = computed(() => {
    const config = this.store.sourceConfig();
    return config && config.source === 'filtered' ? config : null;
  });

  /** Other datasets on this report it could filter — never itself. */
  protected readonly baseOptions = computed(() =>
    this.store.datasets().filter((d) => d.id !== this.store.selectedId()),
  );

  private readonly baseDatasetId = computed(() => this.config()?.baseDatasetId ?? null);

  // The base dataset's own schema — what the filter is built against — refetched whenever the
  // chosen base changes.
  private readonly baseSchemaResource = httpResource<DatasetSchema>(() =>
    this.baseDatasetId() ? `/api/datasets/${this.baseDatasetId()}/schema` : undefined,
  );
  private readonly baseSchema = computed(() =>
    this.baseSchemaResource.hasValue() ? this.baseSchemaResource.value() : null,
  );
  protected readonly baseSchemaLoading = this.baseSchemaResource.isLoading;

  private readonly catalogue = signal<OperatorCatalogue | null>(null);

  private readonly context: FilterContext = {
    schema: this.baseSchema,
    catalogue: this.catalogue,
    ownerId: `filtered-dataset:${this.store.selectedId() ?? 0}`,
  };

  // One model per chosen base dataset: rebuilt only when the base id changes (not on every edit, and
  // not on the server echo after a save), so in-progress edits stay in the same model instance while
  // the debounced save below persists them. Built in an effect, not a computed: the model's
  // constructor writes to its own signals, which a computed forbids (NG0600).
  private readonly filterGroupSignal = signal<FilterGroupModel | null>(null);
  protected readonly filterGroup = this.filterGroupSignal.asReadonly();

  constructor() {
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

    // Saves the filter a short debounce after each edit — a burst of edits (typing an operand)
    // makes one request, not one per keystroke, the same way the live match count settles.
    toObservable(computed(() => this.filterGroup()?.toQueryDto() ?? null))
      .pipe(
        skip(1),
        debounceTime(500),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(),
      )
      .subscribe((filter) => {
        const config = this.config();
        if (!config) return;
        this.store.updateSourceConfig({ ...config, filter });
      });
  }

  /** Repoints the filter at a different base dataset. The filter resets — it named the old base's columns. */
  protected setBaseDataset(baseDatasetId: number): void {
    const config = this.config();
    if (!config || baseDatasetId === config.baseDatasetId) return;
    this.store.updateSourceConfig({ ...config, baseDatasetId, filter: null });
  }
}
