import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetSource, DatasetSummary } from '../../../core/models/dataset';
import { DatasetAutosave } from './dataset-autosave';

/**
 * The datasets screen's session state: which report's draft is being edited, the
 * list of that draft's datasets, and which one is selected — plus the
 * dataset-level lifecycle (create, rename, duplicate, delete) and the fixed set
 * of source systems the pickers draw from.
 *
 * The selection is driven by the `dataset` query param (see {@link selectedId})
 * rather than held in a plain signal, so it survives a reload, a deep link and
 * back/forward. The schema/rows collaborators key their resources off it.
 * Provided at the datasets page; the other collaborators and {@link DatasetsStore}
 * inject it.
 */
@Injectable()
export class DatasetCollection {
  private readonly api = inject(DatasetApiService);
  private readonly autosave = inject(DatasetAutosave);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  /** The report whose draft datasets are being edited; set by the page from the route. */
  private readonly reportId = signal<number | null>(null);

  /** The fixed set of source systems, for the source pickers. Loaded once. */
  private readonly sourcesResource = httpResource<DatasetSource[]>(() => '/api/dataset-sources', {
    defaultValue: [],
  });
  readonly sources = this.sourcesResource.value;

  private readonly datasetsResource = httpResource<DatasetSummary[]>(
    () => (this.reportId() !== null ? `/api/reports/${this.reportId()}/datasets` : undefined),
    { defaultValue: [] },
  );
  readonly datasets = this.datasetsResource.value;

  /** True while the dataset list is first loading, for the sidebar's skeleton. */
  readonly datasetsLoading = this.datasetsResource.isLoading;

  /** A failure loading the dataset list, shown in the sidebar. */
  readonly listError = computed(() =>
    this.datasetsResource.error()
      ? "These datasets couldn't be loaded — the report may have no checked-out draft, or you may not have access to it."
      : null,
  );

  // Selection is the `dataset` query param, so the URL is the source of truth:
  // reloading, deep-linking or using back/forward all restore the open dataset.
  private readonly datasetParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('dataset'))),
    { initialValue: this.route.snapshot.queryParamMap.get('dataset') },
  );
  readonly selectedId = computed(() => {
    const raw = this.datasetParam();
    const id = raw === null ? NaN : Number(raw);
    return Number.isInteger(id) ? id : null;
  });

  readonly selected = computed(
    () => this.datasets().find((d) => d.id === this.selectedId()) ?? null,
  );

  constructor() {
    // With nothing selected in the URL, default to the first dataset once the
    // list arrives (replacing history so the bare URL isn't a back-button trap).
    // Only fills an empty selection — a param pointing at a real dataset wins.
    effect(() => {
      const list = this.datasets();
      untracked(() => {
        if (this.selectedId() === null && list.length) this.openDataset(list[0].id, true);
      });
    });
  }

  /** Points the store at a report's draft datasets; the list refetches reactively. */
  setReport(reportId: number): void {
    if (reportId === this.reportId()) return;
    this.reportId.set(reportId);
  }

  select(id: number): void {
    this.openDataset(id);
  }

  /**
   * Writes the selection to the `dataset` query param, which the URL then drives
   * back into {@link selectedId}. Replacing history is used for automatic moves
   * (the initial default, closing a deleted dataset) so only a user's explicit
   * pick leaves a back-button step.
   */
  private openDataset(id: number | null, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dataset: id },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  /** Refetches the dataset list; used after a source change to refresh its source chip. */
  reloadList(): void {
    this.datasetsResource.reload();
  }

  /**
   * True when another dataset on this report already uses `name` (trimmed,
   * case-insensitive), ignoring the currently selected one — so a duplicate name
   * can be caught before it's saved. Exposed for the toolbar's rename field.
   */
  datasetNameTaken(name: string): boolean {
    return this.nameTaken(name, this.selectedId());
  }

  private nameTaken(name: string, exceptId: number | null): boolean {
    const key = name.trim().toLowerCase();
    return this.datasets().some(
      (dataset) => dataset.id !== exceptId && dataset.name.trim().toLowerCase() === key,
    );
  }

  createDataset(name: string, sourceId: number): void {
    const trimmed = name.trim();
    const reportId = this.reportId();
    if (!trimmed || reportId === null || !sourceId) return;
    // Don't save a name that already exists — it would land the report with two
    // indistinguishable datasets (see DatasetValidation's duplicate-name check).
    if (this.nameTaken(trimmed, null)) {
      this.notify.error(`A dataset called "${trimmed}" already exists. Choose a different name.`);
      return;
    }
    this.autosave.track(this.api.create(reportId, trimmed, sourceId)).subscribe({
      next: (dataset) => {
        this.openDataset(dataset.id);
        this.datasetsResource.reload();
        this.notify.success(`Dataset "${trimmed}" created.`);
      },
      error: () => this.notify.error(`Couldn't create "${trimmed}". Please try again.`),
    });
  }

  renameDataset(name: string): void {
    const id = this.selectedId();
    const trimmed = name.trim();
    // Skip the save when the name is blank or unchanged, so blurring the field
    // without editing it doesn't fire a needless request.
    if (!id || !trimmed || trimmed === this.selected()?.name) return;
    // Don't save a name another dataset already uses — it would leave the report
    // with two datasets that can't be told apart.
    if (this.nameTaken(trimmed, id)) {
      this.notify.error(`Another dataset is already called "${trimmed}". Choose a different name.`);
      return;
    }
    this.autosave.track(this.api.rename(id, trimmed)).subscribe({
      next: () => {
        this.datasetsResource.reload();
        this.notify.success(`Dataset renamed to "${trimmed}".`);
      },
      error: () => this.notify.error(`Couldn't rename the dataset to "${trimmed}". Please try again.`),
    });
  }

  /** The name, suffixed with a counter if needed, so it doesn't collide with an existing dataset. */
  private uniqueName(base: string): string {
    if (!this.nameTaken(base, null)) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base} ${n}`;
      if (!this.nameTaken(candidate, null)) return candidate;
    }
  }

  /** Deep-copies the selected dataset and opens the copy. */
  cloneDataset(): void {
    const dataset = this.selected();
    if (!dataset) return;
    // A plain "(copy)" would clash on a second clone, so land on a free name.
    this.autosave.track(this.api.clone(dataset.id, this.uniqueName(`${dataset.name} (copy)`))).subscribe({
      next: (created) => {
        this.openDataset(created.id);
        this.datasetsResource.reload();
        this.notify.success(`Duplicated "${dataset.name}".`);
      },
      error: () => this.notify.error(`Couldn't duplicate "${dataset.name}". Please try again.`),
    });
  }

  deleteDataset(): void {
    const id = this.selectedId();
    if (!id) return;
    const name = this.selected()?.name;
    // Pick the next surviving dataset up front so the delete opens it directly,
    // rather than briefly clearing the selection and re-defaulting to the first.
    const next = this.datasets().find((d) => d.id !== id)?.id ?? null;
    this.autosave.track(this.api.remove(id)).subscribe({
      next: () => {
        this.openDataset(next, true);
        this.datasetsResource.reload();
        this.notify.success(`Deleted "${name ?? 'the dataset'}".`);
      },
      error: () =>
        this.notify.error(`Couldn't delete "${name ?? 'the dataset'}". Please try again.`),
    });
  }
}
