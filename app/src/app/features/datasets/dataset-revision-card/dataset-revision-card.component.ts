import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { ReportSummary } from '../../../core/models/report';
import { DatasetsStore } from '../datasets.store';

/**
 * A slim header card above the dataset editor that says which report revision these datasets belong
 * to. Datasets are always edited on the report's checked-out draft, so this shows the report's
 * identity, that a draft is being edited, and how that draft relates to what's published — plus how
 * many datasets the draft holds. The report summary is fetched by id, mirroring the viewer.
 */
@Component({
  selector: 'app-dataset-revision-card',
  templateUrl: './dataset-revision-card.component.html',
  styleUrl: './dataset-revision-card.component.scss',
  host: { class: 'app-card' },
})
export class DatasetRevisionCardComponent {
  private readonly store = inject(DatasetsStore);

  readonly reportId = input.required<number>();

  private readonly reportResource = httpResource<ReportSummary>(() => `/api/reports/${this.reportId()}`);
  protected readonly report = computed(() =>
    this.reportResource.hasValue() ? this.reportResource.value() : null,
  );
  protected readonly loading = this.reportResource.isLoading;

  /** Editing an already-published report produces a next-version draft; otherwise it's the report's first, unpublished draft. */
  protected readonly draftLabel = computed(() =>
    this.report()?.latestVersionNumber != null ? 'Draft in progress' : 'Draft',
  );

  /** How this draft relates to what's published. */
  protected readonly basedOn = computed(() => {
    const version = this.report()?.latestVersionNumber;
    return version != null ? `Based on published v${version}` : 'Not yet published';
  });

  protected readonly datasetCount = this.store.datasets;
}
