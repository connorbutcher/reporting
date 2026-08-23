import { DestroyRef, Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import { FilterApiService } from '../../core/api/filter-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { DatasetColumnConfiguration, DatasetSummary } from '../../core/models/dataset';
import { OperatorCatalogue } from '../../core/models/filter';
import { ReportRevisionContent, WidgetType } from '../../core/models/report';
import { DatasetSchemaCacheService } from '../../core/services/dataset-schema-cache.service';
import { NotificationService } from '../../core/services/notification.service';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS, ReportModel } from './models/report.model';
import { ValidationIssue } from './models/validation-issue';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  ModelSources,
  WidgetModel,
} from './models/widget.model';
import { PanelView } from './side-panel/panel-view';
import { DatasetSchema } from './state/dataset-schema';
import { ReportAutosave } from './state/report-autosave';
import { ReportLifecycle } from './state/report-lifecycle';
import { SidePanelNavigation } from './state/side-panel-navigation';
import { WidgetCommands } from './state/widget-commands';
import { WidgetSelection } from './state/widget-selection';

/**
 * Session state for the report builder screen: what is loaded, what is
 * selected, where the panel is, and talking to the API.
 *
 * The report's own state lives in the {@link ReportModel} tree — every edit
 * goes through those instance classes. This store is a thin facade that owns the
 * shared session signals and composes a handful of focused collaborators, each
 * one responsible for a single concern:
 *
 * - {@link SidePanelNavigation} / {@link WidgetSelection} — panel history and canvas selection;
 * - {@link ReportAutosave} — writing edits back and the undo stack;
 * - {@link ReportLifecycle} — loading and publishing;
 * - {@link WidgetCommands} — add / remove / duplicate / move;
 * - {@link DatasetSchema} — dataset schemas and column configuration.
 *
 * Everything is re-exposed behind the same API the store always had, so callers
 * never need to know the collaborators exist.
 */
@Injectable()
export class ReportBuilderStore {
  private readonly reportApi = inject(ReportApiService);
  private readonly datasetApi = inject(DatasetApiService);
  private readonly filterApi = inject(FilterApiService);
  private readonly router = inject(Router);
  private readonly schemaCache = inject(DatasetSchemaCacheService);
  private readonly notify = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // --- shared session state --------------------------------------------------

  readonly model = signal<ReportModel | null>(null);
  readonly datasets = signal<DatasetSummary[]>([]);
  readonly loading = signal(true);

  /** Filter operators per column type; static for the server's lifetime. */
  readonly operatorCatalogue = signal<OperatorCatalogue | null>(null);

  /**
   * The measured pixel width of one grid column. Columns stretch to fill the
   * canvas, so this is only known at runtime; the canvas measures it and the
   * drag/resize directives read it to convert pointer movement into whole cells.
   */
  readonly columnWidth = signal(0);

  /** The look-ups every model node validates and describes itself against. */
  private readonly sources: ModelSources = {
    schemas: this.schemaCache.schemas,
    catalogue: this.operatorCatalogue.asReadonly(),
  };

  private readonly navigation = new SidePanelNavigation();
  private readonly selection = new WidgetSelection();

  // --- panel navigation and selection (delegated) ----------------------------

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
  readonly gridColumns = computed(() => this.model()?.gridColumns() ?? DEFAULT_GRID_COLUMNS);
  readonly gridRows = computed(() => this.model()?.gridRows() ?? DEFAULT_GRID_ROWS);

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

  // --- concern collaborators -------------------------------------------------

  private readonly autosave = new ReportAutosave(
    this.model,
    this.reportApi,
    this.injector,
    this.destroyRef,
  );

  private readonly schema = new DatasetSchema(
    this.schemaCache,
    this.selectedTableWidget,
    this.widgets,
    this.injector,
  );

  private readonly lifecycle = new ReportLifecycle(
    this.reportApi,
    this.datasetApi,
    this.filterApi,
    this.router,
    this.model,
    this.operatorCatalogue,
    this.datasets,
    this.loading,
    this.sources,
    this.autosave,
    this.notify,
  );

  private readonly commands = new WidgetCommands(
    this.model,
    this.selection,
    this.selectedWidgets,
    (view) => this.navigate(view),
    (view) => this.replace(view),
  );

  // --- collaborator pass-throughs --------------------------------------------

  /** True while a save request is in flight, for a "Saving…" indicator. */
  readonly saving = this.autosave.saving;
  /** True when the last save failed, so the canvas can warn instead of losing work quietly. */
  readonly saveFailed = this.autosave.saveFailed;
  readonly canUndo = this.autosave.canUndo;
  readonly canRedo = this.autosave.canRedo;

  /** Whether this draft differs from what was loaded (or last published). */
  readonly hasUnpublishedChanges = this.lifecycle.hasUnpublishedChanges;

  /** Bumped when a column's configuration changes, so widgets re-read it. */
  readonly datasetVersion = this.schema.datasetVersion;
  /** Columns of the selected table's dataset, or empty until they arrive. */
  readonly activeSchemaColumns = this.schema.activeSchemaColumns;
  /** A table needs a dataset before columns can be chosen. */
  readonly hasDataset = this.schema.hasDataset;

  /**
   * Whether leaving right now could lose work: an edit hasn't reached the
   * server yet, or the last attempt to send it failed. Shared by the
   * beforeunload handler and the route guard so both agree on the risk.
   */
  readonly hasUnsavedRisk = computed(() => this.dirty() || this.saveFailed());

  // --- loading / publishing --------------------------------------------------

  load(reportId: number): void {
    this.lifecycle.load(reportId);
  }

  publish(notes: string | null): void {
    this.lifecycle.publish(notes);
  }

  // --- navigation ------------------------------------------------------------

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

  /** Takes the user to whatever the issue is about. */
  goToIssue(issue: ValidationIssue): void {
    if (issue.widgetId) this.selection.set([issue.widgetId]);
    this.navigate(issue.view);
  }

  private syncSelectionToView(): void {
    const view = this.view();
    // Panel navigation always focuses a single widget; canvas multi-selection
    // is only replaced when the panel actually moves to a different one.
    if ('widgetId' in view && !this.selectedWidgetIds().includes(view.widgetId)) {
      this.selection.select(view.widgetId);
    }
  }

  // --- widget lifecycle (delegated) ------------------------------------------

  addWidget(type: WidgetType): void {
    this.commands.addWidget(type);
  }

  removeWidget(widgetId: string): void {
    this.commands.removeWidget(widgetId);
  }

  removeWidgets(widgetIds: readonly string[]): void {
    this.commands.removeWidgets(widgetIds);
  }

  duplicateSelection(): void {
    this.commands.duplicateSelection();
  }

  nudgeSelection(dx: number, dy: number): void {
    this.commands.nudgeSelection(dx, dy);
  }

  stepWidget(offset: number): void {
    this.commands.stepWidget(offset);
  }

  // --- undo / redo -----------------------------------------------------------

  undo(): void {
    this.restore(this.autosave.undo());
  }

  redo(): void {
    this.restore(this.autosave.redo());
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

  // --- dataset schema (delegated) --------------------------------------------

  updateColumnConfiguration(
    datasetId: number,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): void {
    this.schema.updateColumnConfiguration(datasetId, columnId, configuration);
  }
}
