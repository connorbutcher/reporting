import { DatasetSummary } from '../../../core/models/dataset';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, WritableSignal } from '@angular/core';
import { ReportSummary } from '../../../core/models/report';
import { DatasetsStore } from '../datasets.store';

@Component({
  selector: 'app-dataset-revision-card',
  templateUrl: './dataset-revision-card.component.html',
  styleUrl: './dataset-revision-card.component.scss',
  host: { class: 'app-card' },
})
export class DatasetRevisionCardComponent {
  public readonly reportId = input.required<number>();

  public readonly report = computed(() =>
    this.reportResource.hasValue() ? this.reportResource.value() : null,
  );

  /** Editing an already-published report produces a next-version draft; otherwise it's the report's first, unpublished draft. */
  public readonly draftLabel = computed(() =>
    this.report()?.latestVersionNumber != null ? 'Draft in progress' : 'Draft',
  );

  /** How this draft relates to what's published. */
  public readonly basedOn = computed(() => {
    const version = this.report()?.latestVersionNumber;
    return version != null ? `Based on published v${version}` : 'Not yet published';
  });

  public readonly datasetCount: WritableSignal<DatasetSummary[]>;

  private readonly store = inject(DatasetsStore);

  private readonly reportResource = httpResource<ReportSummary>(
    () => `/api/reports/${this.reportId()}`,
  );

  constructor() {
    this.datasetCount = this.store.datasets;
  }

  public get loading() {
    return this.reportResource.isLoading;
  }
}
