import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, filter, map, switchMap, tap } from 'rxjs';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import { FilterApiService } from '../../core/api/filter-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { DatasetSchemaCacheService } from '../../core/services/dataset-schema-cache.service';
import { OperatorCatalogue } from '../../core/models/filter.model';
import { DatasetColumnConfiguration, DatasetSummary } from '../../core/models/dataset.model';
import { ReportRevisionContent, WidgetType } from '../../core/models/report.model';
import { fitsWithoutCollision } from './grid.util';
import { ReportModel } from './models/report.model';
import { UndoHistory } from './models/undo-history';
import { ValidationIssue } from './models/validation-issue';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  ModelSources,
  WidgetModel,
} from './models/widget.model';
import { PanelView } from './side-panel/panel-view';
import { SidePanelNavigation } from './state/side-panel-navigation';
import { WidgetSelection } from './state/widget-selection';

const SAVE_DEBOUNCE_MS = 250;
/** Long enough that a burst of typing collapses into one undo step. */
const HISTORY_DEBOUNCE_MS = 400;

/**
 * Session state for the report builder screen: what is loaded, what is
 * selected, where the panel is, and talking to the API.
 *
 * The report's own state lives in the {@link ReportModel} tree — every edit
 * goes through those instance classes, and their aggregated validity and
 * dirty state is what drives saving here. Side-panel navigation and widget
 * selection are each their own small collaborator ({@link SidePanelNavigation},
 * {@link WidgetSelection}); this store composes them behind the same API it
 * always had, so callers don't need to know they exist.
 */
@Injectable()
export class ReportBuilderStore {
  private readonly reportApi = inject(ReportApiService);
  private readonly datasetApi = inject(DatasetApiService);
  private readonly filterApi = inject(FilterApiService);
  private readonly router = inject(Router);
  private readonly schemaCache = inject(DatasetSchemaCacheService);

  private readonly saveQueue = new Subject<void>();
  private readonly historyQueue = new Subject<void>();
  private readonly history = new UndoHistory();
  private readonly navigation = new SidePanelNavigation();
  private readonly selection = new WidgetSelection();

  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;

  readonly model = signal<ReportModel | null>(null);
  readonly datasets = signal<DatasetSummary[]>([]);
  readonly loading = signal(true);
  /** True when the last save failed, so the canvas can warn instead of losing work quietly. */
  readonly saveFailed = signal(false);
  /** True while a save request is in flight, for a "Saving…" indicator. */
  readonly saving = signal(false);

  /** Filter operators per column type; static for the server's lifetime. */
  readonly operatorCatalogue = signal<OperatorCatalogue | null>(null);

  /** The look-ups every model node validates and describes itself against. */
  private readonly sources: ModelSources = {
    schemas: this.schemaCache.schemas,
    catalogue: this.operatorCatalogue.asReadonly(),
  };

  /** Bumped when a column's configuration changes, so widgets re-read it. */
  readonly datasetVersion = signal(0);

  readonly view = this.navigation.view;
  readonly canGoBack = this.navigation.canGoBack;
  readonly canGoForward = this.navigation.canGoForward;

  /** Every selected widget, in the order they were added to the selection. */
  readonly selectedWidgetIds = this.selection.selectedWidgetIds;

  /**
   * The widget the side panel configures — the most recently selected one.
   * Multi-selection is for canvas operations; the panel always edits one.
   */
  readonly selectedWidgetId = this.selection.selectedWidgetId;
  readonly hasMultiSelection = this.selection.hasMultiSelection;

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

  /**
   * Whether leaving right now could lose work: an edit hasn't reached the
   * server yet, or the last attempt to send it failed. Shared by the
   * beforeunload handler and the route guard so both agree on the risk.
   */
  readonly hasUnsavedRisk = computed(() => this.dirty() || this.saveFailed());

  /**
   * The normalised snapshot the draft had when it was loaded (or last
   * published), for detecting whether there's anything new to publish.
   * `model.dirty()` can't answer that: it clears the moment autosave catches
   * up, and the model even starts "dirty" on load (see EditorNode.dirty)
   * purely to push its own normalisation to the server — neither of those
   * is a real edit worth unblocking Publish for.
   */
  private loadBaseline: string | null = null;

  /** Whether this draft differs from what was loaded (or last published). */
  readonly hasUnpublishedChanges = computed(() => {
    const model = this.model();
    if (!model || this.loadBaseline === null) return false;
    return JSON.stringify(model.toDto()) !== this.loadBaseline;
  });
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

  /** The selected widget, narrowed to a chart — null for every other type. */
  readonly selectedChartWidget = computed<ChartWidgetModel | null>(() => {
    const widget = this.selectedWidget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  /** The selected widget, when it's a kind that carries its own filter. */
  readonly selectedFilterableWidget = computed<DataTableWidgetModel | ChartWidgetModel | null>(
    () => {
      const widget = this.selectedWidget();
      return widget instanceof DataTableWidgetModel || widget instanceof ChartWidgetModel
        ? widget
        : null;
    },
  );

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
        if (widget instanceof DataTableWidgetModel || widget instanceof ChartWidgetModel) {
          const datasetId = widget.datasetId();
          if (datasetId) this.schemaCache.ensure(datasetId);
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
        tap(() => this.saving.set(true)),
        switchMap(() => {
          const model = this.model();
          if (!model) return EMPTY;

          return this.reportApi.updateDraft(model.reportId, model.toDto()).pipe(
            map(() => model),
            // Catch inside the switchMap: an error reaching the outer stream
            // would tear down the subscription and silently stop all saving.
            catchError((error: unknown) => {
              console.error('Failed to save report', error);
              this.saveFailed.set(true);
              this.saving.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((model) => {
        this.saveFailed.set(false);
        this.saving.set(false);
        // Any edit made while the request was in flight has already queued a
        // fresh save, which cancels this one before it can mark it clean.
        model.markPristine();
      });
  }

  /**
   * Loads the draft checked out for the given report. The report viewer is
   * responsible for checking a draft out before routing here; if none exists
   * (e.g. a direct navigation or a page refresh mid-edit) one is checked out
   * on the fly so the canvas still has something to edit.
   */
  load(reportId: number): void {
    this.loading.set(true);
    this.datasetApi.listForReport(reportId).subscribe((datasets) => this.datasets.set(datasets));
    this.filterApi.operators().subscribe((catalogue) => this.operatorCatalogue.set(catalogue));

    this.reportApi.getDraft(reportId).subscribe({
      next: (content) => this.setLoadedReport(content),
      error: () =>
        this.reportApi.checkout(reportId).subscribe((content) => this.setLoadedReport(content)),
    });
  }

  /** Publishes the checked-out draft as a new version, then returns to the viewer. */
  publish(notes: string | null): void {
    const model = this.model();
    if (!model) return;

    this.reportApi.publish(model.reportId, notes).subscribe(() => {
      this.loadBaseline = JSON.stringify(model.toDto());
      this.router.navigate(['/reports', model.reportId]);
    });
  }

  // --- navigation -----------------------------------------------------------

  navigate(view: PanelView): void {
    this.navigation.navigate(view);
    this.syncSelectionToView();
  }

  /** Replaces the current entry, for stepping sideways without adding history. */
  replace(view: PanelView): void {
    this.navigation.replace(view);
    this.syncSelectionToView();
  }

  back(): void {
    this.navigation.back();
    this.syncSelectionToView();
  }

  forward(): void {
    this.navigation.forward();
    this.syncSelectionToView();
  }

  /** Selecting a widget anywhere opens its configuration in the panel. */
  selectWidget(widgetId: string): void {
    const current = this.view();
    const alreadyThere =
      current.kind === 'widget' &&
      current.widgetId === widgetId &&
      this.selectedWidgetIds().length === 1;

    this.selection.select(widgetId);
    if (!alreadyThere) this.navigate({ kind: 'widget', widgetId });
  }

  /** Adds to or removes from the selection, for ctrl/shift-clicking on the canvas. */
  toggleWidgetSelection(widgetId: string): void {
    this.selection.toggle(widgetId);
    const primary = this.selectedWidgetIds().at(-1);
    if (primary) this.navigate({ kind: 'widget', widgetId: primary });
  }

  clearSelection(): void {
    this.selection.clear();
  }

  isSelected(widgetId: string): boolean {
    return this.selection.has(widgetId);
  }

  /** Selects a widget without navigating to it — for a caller about to navigate elsewhere itself. */
  selectOnly(widgetId: string): void {
    this.selection.set([widgetId]);
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
    if (issue.widgetId) this.selection.set([issue.widgetId]);
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

    this.selection.filterOut(widgetIds);
    if (this.selectedWidgetIds().length === 0) this.navigate({ kind: 'widgets' });
  }

  /** Copies the current selection, and selects the copies. */
  duplicateSelection(): void {
    const model = this.model();
    const ids = this.selectedWidgetIds();
    if (!model || ids.length === 0) return;

    const copies = ids.map((id) => model.duplicateWidget(id)).filter((w): w is WidgetModel => !!w);
    if (copies.length === 0) return;

    this.selection.set(copies.map((w) => w.id));
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

    if (!fitsWithoutCollision(targets, others, model.gridColumns(), model.gridRows())) return;

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
  private restore(report: ReportRevisionContent | null): void {
    if (!report) return;
    this.model.set(new ReportModel(report, this.sources));

    const present = new Set(report.widgets.map((w) => w.id));
    this.selection.set(this.selectedWidgetIds().filter((id) => present.has(id)));
  }

  private setLoadedReport(report: ReportRevisionContent): void {
    const model = ReportModel.fromDto(report, this.sources);
    this.model.set(model);
    this.loadBaseline = JSON.stringify(model.toDto());
    // Seeded from the model, not the server payload: the model normalises
    // defaults and key order, so anything else would look like a change and
    // leave an undo step available before the user has done anything.
    this.history.reset(model.toDto());
    this.loading.set(false);
  }

  // --- dataset schema -------------------------------------------------------

  /** Columns of the selected table's dataset, or empty until they arrive. */
  readonly activeSchemaColumns = computed(
    () => this.selectedTableWidget()?.schema()?.columns ?? [],
  );

  /** A table needs a dataset before columns can be chosen. */
  readonly hasDataset = computed(() => !!this.selectedTableWidget()?.datasetId());

  updateColumnConfiguration(
    datasetId: number,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): void {
    this.schemaCache.updateColumnConfiguration(datasetId, columnId, configuration);
    this.datasetVersion.update((v) => v + 1);
  }

  private syncSelectionToView(): void {
    const view = this.view();
    // Panel navigation always focuses a single widget; canvas multi-selection
    // is only replaced when the panel actually moves to a different one.
    if ('widgetId' in view && !this.selectedWidgetIds().includes(view.widgetId)) {
      this.selection.select(view.widgetId);
    }
  }
}
