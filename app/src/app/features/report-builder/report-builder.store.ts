import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, filter, map, switchMap } from 'rxjs';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import {
  DatasetColumnConfiguration,
  DatasetSchema,
  DatasetSummary,
} from '../../core/models/dataset.model';
import { Report, WidgetType } from '../../core/models/report.model';
import { rectsOverlap } from './grid.util';
import { ReportModel } from './models/report.model';
import { UndoHistory } from './models/undo-history';
import { ValidationIssue } from './models/validation-issue';
import { DataTableWidgetModel, WidgetModel } from './models/widget.model';
import { PanelView } from './side-panel/panel-view';

const SAVE_DEBOUNCE_MS = 250;
/** Long enough that a burst of typing collapses into one undo step. */
const HISTORY_DEBOUNCE_MS = 400;

/**
 * Session state for the report builder screen: what is loaded, what is
 * selected, where the panel is, and talking to the API.
 *
 * The report's own state lives in the {@link ReportModel} tree — every edit
 * goes through those instance classes, and their aggregated validity and
 * dirty state is what drives saving here.
 */
@Injectable()
export class ReportBuilderStore {
  private readonly reportApi = inject(ReportApiService);
  private readonly datasetApi = inject(DatasetApiService);

  private readonly saveQueue = new Subject<void>();
  private readonly historyQueue = new Subject<void>();
  private readonly history = new UndoHistory();

  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;

  readonly model = signal<ReportModel | null>(null);
  readonly datasets = signal<DatasetSummary[]>([]);
  readonly loading = signal(true);
  /** True when the last save failed, so the canvas can warn instead of losing work quietly. */
  readonly saveFailed = signal(false);

  /** Cached per dataset id so panel interactions never refetch the schema. */
  private readonly schemaCache = signal<Record<string, DatasetSchema>>({});
  private readonly inFlightSchemas = new Set<string>();

  /** Bumped when a column's configuration changes, so widgets re-read it. */
  readonly datasetVersion = signal(0);

  /** Where the side panel has been, separate from the report's undo stack. */
  private readonly viewHistory = signal<PanelView[]>([{ kind: 'root' }]);
  private readonly viewIndex = signal(0);

  readonly view = computed(() => this.viewHistory()[this.viewIndex()]);
  readonly canGoBack = computed(() => this.viewIndex() > 0);
  readonly canGoForward = computed(() => this.viewIndex() < this.viewHistory().length - 1);

  /** Every selected widget, in the order they were added to the selection. */
  readonly selectedWidgetIds = signal<readonly string[]>([]);

  /**
   * The widget the side panel configures — the most recently selected one.
   * Multi-selection is for canvas operations; the panel always edits one.
   */
  readonly selectedWidgetId = computed(() => this.selectedWidgetIds().at(-1) ?? null);
  readonly hasMultiSelection = computed(() => this.selectedWidgetIds().length > 1);

  // --- report state, delegated to the model tree -----------------------------

  readonly widgets = computed<readonly WidgetModel[]>(() => this.model()?.widgets() ?? []);
  readonly gridColumns = computed(() => this.model()?.gridColumns() ?? 12);
  readonly gridRows = computed(() => this.model()?.gridRows() ?? 10);

  readonly issues = computed<ValidationIssue[]>(() => this.model()?.issues() ?? []);
  readonly errors = computed(() => this.model()?.errors() ?? []);
  readonly warnings = computed(() => this.model()?.warnings() ?? []);
  readonly isValid = computed(() => this.model()?.isValid() ?? true);
  readonly dirty = computed(() => this.model()?.dirty() ?? false);
  readonly saveBlocked = computed(() => this.dirty() && !this.isValid());
  readonly issuesByWidget = computed<Map<string, ValidationIssue[]>>(
    () => this.model()?.issuesByWidget() ?? new Map(),
  );

  readonly selectedWidget = computed<WidgetModel | null>(() => {
    const id = this.selectedWidgetId();
    return id ? (this.model()?.widget(id) ?? null) : null;
  });

  /** All selected widgets, skipping any that have since been removed. */
  readonly selectedWidgets = computed<WidgetModel[]>(() => {
    const model = this.model();
    if (!model) return [];
    return this.selectedWidgetIds()
      .map((id) => model.widget(id))
      .filter((w): w is WidgetModel => !!w);
  });

  /** The selected widget, narrowed to a table — null for every other type. */
  readonly selectedTableWidget = computed<DataTableWidgetModel | null>(() => {
    const widget = this.selectedWidget();
    return widget instanceof DataTableWidgetModel ? widget : null;
  });

  constructor() {
    // Any change anywhere in the tree shows up as a new snapshot here, so this
    // one effect covers every edit without each caller remembering to save.
    // Reading isValid too means fixing an error re-triggers the held-back save.
    effect(() => {
      const model = this.model();
      if (!model) return;

      const dirty = model.dirty();
      const valid = model.isValid();
      if (!dirty || !valid) return;

      untracked(() => this.saveQueue.next());
    });

    // Undo steps are captured from the same snapshot the save uses, so the two
    // always agree on what "the current state" is.
    effect(() => {
      const model = this.model();
      if (!model) return;

      model.toDto();
      untracked(() => this.historyQueue.next());
    });

    this.historyQueue
      .pipe(debounceTime(HISTORY_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => {
        const model = this.model();
        if (model) this.history.capture(model.toDto());
      });

    // Every referenced dataset is needed, not just the selected one, so column
    // validation can tell a missing column from a schema that hasn't loaded.
    effect(() => {
      for (const widget of this.widgets()) {
        if (widget instanceof DataTableWidgetModel) {
          const datasetId = widget.datasetId();
          if (datasetId) this.ensureSchema(datasetId);
        }
      }
    });

    // Saves are coalesced so dragging, typing and toggling stay responsive;
    // switchMap drops superseded writes rather than racing them.
    this.saveQueue
      .pipe(
        debounceTime(SAVE_DEBOUNCE_MS),
        // A broken report is never written; the effect above re-queues once fixed.
        filter(() => this.isValid()),
        switchMap(() => {
          const model = this.model();
          if (!model) return EMPTY;

          return this.reportApi.update(model.toDto()).pipe(
            map(() => model),
            // Catch inside the switchMap: an error reaching the outer stream
            // would tear down the subscription and silently stop all saving.
            catchError((error: unknown) => {
              console.error('Failed to save report', error);
              this.saveFailed.set(true);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((model) => {
        this.saveFailed.set(false);
        // Any edit made while the request was in flight has already queued a
        // fresh save, which cancels this one before it can mark it clean.
        model.markPristine();
      });
  }

  load(): void {
    this.datasetApi.list().subscribe((datasets) => this.datasets.set(datasets));

    this.reportApi.list().subscribe((reports) => {
      if (reports.length > 0) {
        this.setLoadedReport(reports[0]);
      } else {
        this.reportApi.create('Demo Report').subscribe((report) => this.setLoadedReport(report));
      }
    });
  }

  // --- navigation -----------------------------------------------------------

  navigate(view: PanelView): void {
    // Navigating from a point in history discards anything after it.
    const trimmed = this.viewHistory().slice(0, this.viewIndex() + 1);
    this.viewHistory.set([...trimmed, view]);
    this.viewIndex.set(trimmed.length);
    this.syncSelectionToView();
  }

  /** Replaces the current entry, for stepping sideways without adding history. */
  replace(view: PanelView): void {
    this.viewHistory.update((views) => views.map((v, i) => (i === this.viewIndex() ? view : v)));
    this.syncSelectionToView();
  }

  back(): void {
    if (!this.canGoBack()) return;
    this.viewIndex.update((i) => i - 1);
    this.syncSelectionToView();
  }

  forward(): void {
    if (!this.canGoForward()) return;
    this.viewIndex.update((i) => i + 1);
    this.syncSelectionToView();
  }

  /** Selecting a widget anywhere opens its configuration in the panel. */
  selectWidget(widgetId: string): void {
    const current = this.view();
    const alreadyThere =
      current.kind === 'widget' &&
      current.widgetId === widgetId &&
      this.selectedWidgetIds().length === 1;

    this.selectedWidgetIds.set([widgetId]);
    if (!alreadyThere) this.navigate({ kind: 'widget', widgetId });
  }

  /** Adds to or removes from the selection, for ctrl/shift-clicking on the canvas. */
  toggleWidgetSelection(widgetId: string): void {
    const selected = this.selectedWidgetIds();
    const next = selected.includes(widgetId)
      ? selected.filter((id) => id !== widgetId)
      : [...selected, widgetId];

    this.selectedWidgetIds.set(next);
    const primary = next.at(-1);
    if (primary) this.navigate({ kind: 'widget', widgetId: primary });
  }

  clearSelection(): void {
    this.selectedWidgetIds.set([]);
  }

  isSelected(widgetId: string): boolean {
    return this.selectedWidgetIds().includes(widgetId);
  }

  stepWidget(offset: number): void {
    const widgets = this.widgets();
    const index = widgets.findIndex((w) => w.id === this.selectedWidgetId());
    const next = widgets[index + offset];
    if (!next) return;
    this.replace({ kind: 'widget', widgetId: next.id });
  }

  /** Takes the user to whatever the issue is about. */
  goToIssue(issue: ValidationIssue): void {
    if (issue.widgetId) this.selectedWidgetIds.set([issue.widgetId]);
    this.navigate(issue.view);
  }

  // --- widget lifecycle -----------------------------------------------------

  addWidget(type: WidgetType): void {
    const widget = this.model()?.addWidget(type);
    if (widget) this.selectWidget(widget.id);
  }

  removeWidget(widgetId: string): void {
    this.removeWidgets([widgetId]);
  }

  /** Removes every given widget, then drops them from the selection. */
  removeWidgets(widgetIds: readonly string[]): void {
    if (widgetIds.length === 0) return;
    this.model()?.removeWidgets(widgetIds);

    const doomed = new Set(widgetIds);
    this.selectedWidgetIds.update((ids) => ids.filter((id) => !doomed.has(id)));
    if (this.selectedWidgetIds().length === 0) this.navigate({ kind: 'widgets' });
  }

  /** Copies the current selection, and selects the copies. */
  duplicateSelection(): void {
    const model = this.model();
    const ids = this.selectedWidgetIds();
    if (!model || ids.length === 0) return;

    const copies = ids.map((id) => model.duplicateWidget(id)).filter((w): w is WidgetModel => !!w);
    if (copies.length === 0) return;

    this.selectedWidgetIds.set(copies.map((w) => w.id));
    this.navigate({ kind: 'widget', widgetId: copies[copies.length - 1].id });
  }

  /** Nudges every selected widget, refusing the move if any would collide. */
  nudgeSelection(dx: number, dy: number): void {
    const model = this.model();
    const widgets = this.selectedWidgets();
    if (!model || widgets.length === 0) return;

    const moving = new Set(widgets.map((w) => w.id));
    const others = model.widgets().filter((w) => !moving.has(w.id));

    const targets = widgets.map((widget) => ({
      widget,
      rect: { x: widget.x() + dx, y: widget.y() + dy, w: widget.w(), h: widget.h() },
    }));

    const fits = targets.every(
      ({ rect }) =>
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.w <= model.gridColumns() &&
        rect.y + rect.h <= model.gridRows() &&
        !others.some((other) => rectsOverlap(rect, other.rect())),
    );
    if (!fits) return;

    for (const { widget, rect } of targets) widget.moveTo(rect.x, rect.y);
  }

  // --- undo / redo ----------------------------------------------------------

  undo(): void {
    this.restore(this.history.undo());
  }

  redo(): void {
    this.restore(this.history.redo());
  }

  /**
   * Rebuilds the tree from a snapshot. Built through the constructor rather
   * than `fromDto` so the restored state counts as unsaved and gets written
   * back — an undo the server never hears about would be lost on reload.
   */
  private restore(report: Report | null): void {
    if (!report) return;
    this.model.set(new ReportModel(report, this.schemaCache.asReadonly()));

    const present = new Set(report.widgets.map((w) => w.id));
    this.selectedWidgetIds.update((ids) => ids.filter((id) => present.has(id)));
  }

  private setLoadedReport(report: Report): void {
    const model = ReportModel.fromDto(report, this.schemaCache.asReadonly());
    this.model.set(model);
    // Seeded from the model, not the server payload: the model normalises
    // defaults and key order, so anything else would look like a change and
    // leave an undo step available before the user has done anything.
    this.history.reset(model.toDto());
    this.loading.set(false);
  }

  // --- dataset schema -------------------------------------------------------

  /** Columns of the selected table's dataset, or empty until they arrive. */
  readonly activeSchemaColumns = computed(() => this.selectedTableWidget()?.schema()?.columns ?? []);

  /** A table needs a dataset before columns can be chosen. */
  readonly hasDataset = computed(() => !!this.selectedTableWidget()?.datasetId());

  updateColumnConfiguration(
    datasetId: string,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): void {
    // Update the cached schema straight away so the panel reflects the change,
    // then reconcile with whatever the server stored.
    this.patchCachedColumn(datasetId, columnId, configuration);
    this.datasetVersion.update((v) => v + 1);

    this.datasetApi.updateColumnConfiguration(datasetId, columnId, configuration).subscribe((column) => {
      this.patchCachedColumn(datasetId, columnId, column.configuration ?? {});
    });
  }

  private ensureSchema(datasetId: string): void {
    if (this.schemaCache()[datasetId] || this.inFlightSchemas.has(datasetId)) return;

    this.inFlightSchemas.add(datasetId);
    this.datasetApi.getSchema(datasetId).subscribe({
      next: (schema) => this.schemaCache.update((all) => ({ ...all, [datasetId]: schema })),
      complete: () => this.inFlightSchemas.delete(datasetId),
      error: () => this.inFlightSchemas.delete(datasetId),
    });
  }

  private patchCachedColumn(
    datasetId: string,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): void {
    this.schemaCache.update((all) => {
      const schema = all[datasetId];
      if (!schema) return all;
      return {
        ...all,
        [datasetId]: {
          ...schema,
          columns: schema.columns.map((c) => (c.id === columnId ? { ...c, configuration } : c)),
        },
      };
    });
  }

  private syncSelectionToView(): void {
    const view = this.view();
    // Panel navigation always focuses a single widget; canvas multi-selection
    // is only replaced when the panel actually moves to a different one.
    if ('widgetId' in view && !this.selectedWidgetIds().includes(view.widgetId)) {
      this.selectedWidgetIds.set([view.widgetId]);
    }
  }
}
