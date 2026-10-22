import { httpResource } from '@angular/common/http';
import {
  computed,
  effect,
  inject,
  Injectable,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { HttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetSource, DatasetSummary } from '../../../core/models/dataset';
import { DatasetAutosave } from './dataset-autosave';

@Injectable()
export class DatasetCollection {
  public readonly datasets: WritableSignal<DatasetSummary[]>;

  public readonly datasetsLoading: Signal<boolean>;

  public readonly listError = computed(() =>
    this.datasetsResource.error()
      ? "These datasets couldn't be loaded — the report may have no checked-out draft, or you may not have access to it."
      : null,
  );

  public readonly selectedId = computed(() => {
    const raw = this.datasetParam();
    const id = raw === null ? NaN : Number(raw);
    return Number.isInteger(id) ? id : null;
  });

  public readonly selected = computed(
    () => this.datasets().find((d) => d.id === this.selectedId()) ?? null,
  );

  private readonly api = inject(DatasetApiService);

  private readonly autosave = inject(DatasetAutosave);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly notify = inject(NotificationService);

  private readonly reportId = signal<number | null>(null);

  private readonly sourcesResource = httpResource<DatasetSource[]>(() => '/api/dataset-sources', {
    defaultValue: [],
  });

  // A report with no draft 404s, and the sidebar explains failures itself, so skip the toast.
  private readonly datasetsResource = httpResource<DatasetSummary[]>(
    () =>
      this.reportId() !== null
        ? { url: `/api/reports/${this.reportId()}/datasets`, context: HttpErrorNotification.skip() }
        : undefined,
    { defaultValue: [] },
  );

  // The `dataset` query param is the selection, so reloads and back/forward restore it.
  private readonly datasetParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('dataset'))),
    { initialValue: this.route.snapshot.queryParamMap.get('dataset') },
  );

  constructor() {
    this.datasets = this.datasetsResource.value;
    this.datasetsLoading = this.datasetsResource.isLoading;
    // Defaults an empty selection to the first dataset, replacing history so it isn't a back trap.
    effect(() => {
      const list = this.datasets();
      untracked(() => {
        if (this.selectedId() === null && list.length) {
          this.openDataset(list[0].id, true);
        }
      });
    });
  }

  public setReport(reportId: number): void {
    if (reportId === this.reportId()) {
      return;
    }
    this.reportId.set(reportId);
  }

  public select(id: number): void {
    this.openDataset(id);
  }

  public reloadList(): void {
    this.datasetsResource.reload();
  }

  /** True when another dataset already uses `name` (trimmed, case-insensitive). */
  public datasetNameTaken(name: string): boolean {
    return this.nameTaken(name, this.selectedId());
  }

  public createDataset(name: string, sourceId: number): void {
    const trimmed = name.trim();
    const reportId = this.reportId();
    if (!trimmed || reportId === null || !sourceId) {
      return;
    }
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
      error: (err) => this.notify.apiError(err, `Couldn't create "${trimmed}". Please try again.`),
    });
  }

  public renameDataset(name: string): void {
    const id = this.selectedId();
    const trimmed = name.trim();
    if (!id || !trimmed || trimmed === this.selected()?.name) {
      return;
    }
    if (this.nameTaken(trimmed, id)) {
      this.notify.error(`Another dataset is already called "${trimmed}". Choose a different name.`);
      return;
    }
    this.autosave.track(this.api.rename(id, trimmed)).subscribe({
      next: () => {
        this.datasetsResource.reload();
        this.notify.success(`Dataset renamed to "${trimmed}".`);
      },
      error: (err) =>
        this.notify.apiError(err, `Couldn't rename the dataset to "${trimmed}". Please try again.`),
    });
  }

  public cloneDataset(): void {
    const dataset = this.selected();
    if (!dataset) {
      return;
    }
    this.autosave
      .track(this.api.clone(dataset.id, this.uniqueName(`${dataset.name} (copy)`)))
      .subscribe({
        next: (created) => {
          this.openDataset(created.id);
          this.datasetsResource.reload();
          this.notify.success(`Duplicated "${dataset.name}".`);
        },
        error: (err) =>
          this.notify.apiError(err, `Couldn't duplicate "${dataset.name}". Please try again.`),
      });
  }

  public deleteDataset(): void {
    const id = this.selectedId();
    if (!id) {
      return;
    }
    const name = this.selected()?.name;
    // Opens the next dataset directly instead of clearing and re-defaulting.
    const next = this.datasets().find((d) => d.id !== id)?.id ?? null;
    this.autosave.track(this.api.remove(id)).subscribe({
      next: () => {
        this.openDataset(next, true);
        this.datasetsResource.reload();
        this.notify.success(`Deleted "${name ?? 'the dataset'}".`);
      },
      error: (err) =>
        this.notify.apiError(err, `Couldn't delete "${name ?? 'the dataset'}". Please try again.`),
    });
  }

  public get sources() {
    return this.sourcesResource.value;
  }

  /** Automatic moves replace history so only explicit picks add a back step. */
  private openDataset(id: number | null, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dataset: id },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  private nameTaken(name: string, exceptId: number | null): boolean {
    const key = name.trim().toLowerCase();
    return this.datasets().some(
      (dataset) => dataset.id !== exceptId && dataset.name.trim().toLowerCase() === key,
    );
  }

  private uniqueName(base: string): string {
    if (!this.nameTaken(base, null)) {
      return base;
    }
    for (let n = 2; ; n++) {
      const candidate = `${base} ${n}`;
      if (!this.nameTaken(candidate, null)) {
        return candidate;
      }
    }
  }
}
