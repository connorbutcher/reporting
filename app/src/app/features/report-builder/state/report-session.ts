import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { DatasetSummary } from '../../../core/models/dataset';
import { OperatorCatalogue } from '../../../core/models/filter';
import { ReportRevisionContent, WidgetType } from '../../../core/models/report';
import { FilterApiService } from '../../../core/api/filter-api.service';
import { DatasetSchemaCacheService } from '../../../core/services/dataset-schema-cache.service';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS, ReportModel } from '../models/report.model';
import { ValidationIssue } from '../models/validation-issue';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  ModelSources,
  WidgetModel,
} from '../models/widget.model';
import { WidgetSelection } from './widget-selection';

/**
 * The report-builder's shared session state: the loaded {@link ReportModel} tree
 * and the look-ups it validates against, plus a read-model derived from it (the
 * active tab's widgets and grid, the report's validation, and the current
 * selection resolved to widget instances).
 *
 * Every other collaborator reads the report through this service, so the model
 * signal and the derived views live in exactly one place. Mutating verbs live on
 * the command services; this holds state and exposes it.
 */
@Injectable()
export class ReportSession {
  private readonly schemaCache = inject(DatasetSchemaCacheService);
  private readonly selection = inject(WidgetSelection);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly filterApi = inject(FilterApiService);

  // --- shared session state --------------------------------------------------

  /** The report being edited, taken from the route so it survives a reload/deep-link. */
  private readonly params = toSignal(this.route.paramMap);
  readonly reportId = computed(() => {
    const raw = this.params()?.get('reportId');
    return raw ? Number(raw) : null;
  });

  readonly model = signal<ReportModel | null>(null);

  /** The datasets available to this report's draft, for the pickers. Keyed off the route id. */
  private readonly datasetsResource = httpResource<DatasetSummary[]>(
    () => (this.reportId() !== null ? `/api/reports/${this.reportId()}/datasets` : undefined),
    { defaultValue: [] },
  );
  readonly datasets = this.datasetsResource.value;

  /** Filter operators per column type; static for the server's lifetime, so loaded once. */
  readonly operatorCatalogue = signal<OperatorCatalogue | null>(null);

  // The active tab is the `tab` query param, so the URL is the source of truth:
  // reloading, deep-linking and back/forward all restore the open tab. The value
  // is a tab's stable id (its RefId).
  private readonly tabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tab'))),
    { initialValue: this.route.snapshot.queryParamMap.get('tab') },
  );

  constructor() {
    this.filterApi
      .operators()
      .pipe(takeUntilDestroyed())
      .subscribe((catalogue) => this.operatorCatalogue.set(catalogue));

    // Drive the model's active tab from the URL: a valid `tab` param selects that
    // tab; anything else (missing, or pointing at a removed tab) defaults to the
    // first one and cleans the URL up (replacing history so the bare URL isn't a
    // back-button trap). Re-runs when the tabs change (add/remove/undo) too.
    effect(() => {
      const model = this.model();
      const param = this.tabParam();
      if (!model) return;
      const tabs = model.tabs();
      untracked(() => {
        if (!tabs.length) return;
        const valid = param && tabs.some((t) => t.id === param) ? param : null;
        if (valid === null) this.goToTab(tabs[0].id, true);
        else if (model.activeTabId() !== valid) model.setActiveTab(valid);
      });
    });
  }

  /** Writes the active tab to the `tab` query param, which the URL drives back into the model. */
  goToTab(tabId: string, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  /**
   * The measured pixel width of one grid column. Columns stretch to fill the
   * canvas, so this is only known at runtime; the canvas measures it and the
   * drag/resize directives read it to convert pointer movement into whole cells.
   */
  readonly columnWidth = signal(0);

  /** The look-ups every model node validates and describes itself against. */
  readonly sources: ModelSources = {
    schemas: this.schemaCache.schemas,
    catalogue: this.operatorCatalogue.asReadonly(),
  };

  // --- report state, delegated to the model tree -----------------------------

  // The active tab (resolved from the model's tabs and the route param) is the one
  // grid surface on screen, so its widgets and grid are what the canvas reads and
  // the placement verbs act on. Reading it directly keeps ReportModel out of the
  // per-tab business — it just holds the tabs and the report-level state.
  readonly widgets = computed<readonly WidgetModel[]>(() => this.activeTab()?.widgets() ?? []);
  readonly gridColumns = computed(() => this.activeTab()?.gridColumns() ?? DEFAULT_GRID_COLUMNS);
  readonly gridRows = computed(() => this.activeTab()?.gridRows() ?? DEFAULT_GRID_ROWS);

  setGridColumns(value: number): void {
    this.activeTab()?.setGridColumns(value);
  }

  setGridRows(value: number): void {
    this.activeTab()?.setGridRows(value);
  }

  /** Adds an empty widget to the active tab; null if there's no tab to add it to. */
  addWidget(type: WidgetType): WidgetModel | null {
    return this.activeTab()?.addWidget(type) ?? null;
  }

  readonly tabs = computed(() => this.model()?.tabs() ?? []);
  readonly activeTabId = computed(() => this.model()?.activeTabId() ?? null);
  readonly activeTab = computed(() => this.model()?.activeTab() ?? null);

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
    const id = this.selection.selectedWidgetId();
    return id ? (this.model()?.widget(id) ?? null) : null;
  });

  /** All selected widgets, skipping any that have since been removed. */
  readonly selectedWidgets = computed<WidgetModel[]>(() => {
    const model = this.model();
    if (!model) return [];
    return this.selection
      .selectedWidgetIds()
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

  /**
   * Rebuilds the tree from a snapshot (undo/redo). Built through the constructor
   * rather than `fromDto` so the restored state counts as unsaved and gets
   * written back — an undo the server never hears about would be lost on reload.
   */
  restore(report: ReportRevisionContent | null): void {
    if (!report) return;
    this.model.set(new ReportModel(report, this.sources));
    // The active tab follows the `tab` query param, so the sync effect reselects
    // it against the rebuilt tabs — no need to carry it across here.

    const present = new Set(report.tabs.flatMap((t) => t.widgets.map((w) => w.id)));
    this.selection.set(this.selection.selectedWidgetIds().filter((id) => present.has(id)));
  }
}
