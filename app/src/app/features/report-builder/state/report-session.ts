import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { DatasetSummary } from '../../../core/models/dataset';
import { OperatorCatalogue } from '../../../core/models/filter';
import {
  ReportRevisionContent,
  WidgetType,
  widgetIdFromFragment,
} from '../../../core/models/report';
import { FilterApiService } from '../../../core/api/filter-api.service';
import { skipHttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { DatasetSchemaCacheService } from '../../../core/services/dataset-schema-cache.service';
import { UrlFragmentService } from '../../../core/services/url-fragment.service';
import { ReportModel } from '../models/report.model';
import { TabModel } from '../models/tab.model';
import { ValidationIssue } from '../models/validation-issue';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  KpiWidgetModel,
  PivotTableWidgetModel,
  WidgetModel,
} from '../models/widget.model';
import { WidgetSelection } from './widget-selection';
import { ModelSources } from '../models/sources/model-sources';

/**
 * The report builder's shared state: the {@link ReportModel} tree, the look-ups it validates
 * against, and views derived from it (active tab, validation, selection). Mutations live on the
 * command services.
 */
@Injectable()
export class ReportSession {
  private readonly schemaCache = inject(DatasetSchemaCacheService);
  private readonly selection = inject(WidgetSelection);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly filterApi = inject(FilterApiService);
  private readonly fragments = inject(UrlFragmentService);

  /** From the route, so it survives a reload or deep link. */
  private readonly params = toSignal(this.route.paramMap);
  readonly reportId = computed(() => {
    const raw = this.params()?.get('reportId');
    return raw ? Number(raw) : null;
  });

  readonly model = signal<ReportModel | null>(null);

  /** A 404 is expected before the draft is checked out, so the global not-found toast is skipped. */
  private readonly datasetsResource = httpResource<DatasetSummary[]>(
    () =>
      this.reportId() !== null
        ? { url: `/api/reports/${this.reportId()}/datasets`, context: skipHttpErrorNotification() }
        : undefined,
    { defaultValue: [] },
  );
  readonly datasets = this.datasetsResource.value;

  /** Static for the server's lifetime, so loaded once. */
  readonly operatorCatalogue = signal<OperatorCatalogue | null>(null);

  // The `tab` query param (a tab's stable id) is the source of truth, so reload, deep links and
  // back/forward restore the open tab.
  private readonly tabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tab'))),
    { initialValue: this.route.snapshot.queryParamMap.get('tab') },
  );

  constructor() {
    this.filterApi
      .operators()
      .pipe(takeUntilDestroyed())
      .subscribe((catalogue) => this.operatorCatalogue.set(catalogue));

    // A valid `tab` param selects that tab. Otherwise fall back to the tab owning the widget in the
    // URL fragment, else the first tab, and fix the URL without adding a history entry.
    effect(() => {
      const model = this.model();
      const param = this.tabParam();
      if (!model) return;
      const tabs = model.tabs();
      untracked(() => {
        if (!tabs.length) return;
        const valid = param && tabs.some((t) => t.id === param) ? param : null;
        if (valid === null) {
          const targetWidgetId = widgetIdFromFragment(this.fragments.fragment());
          const targetTab = targetWidgetId ? model.tabOf(targetWidgetId) : null;
          this.goToTab(targetTab?.id ?? tabs[0].id, true);
        } else if (model.activeTabId() !== valid) {
          model.setActiveTab(valid);
        }
      });
    });
  }

  /** Keeps any URL fragment, so switching to a fragment's tab doesn't erase it. */
  goToTab(tabId: string, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl,
    });
  }

  /** One grid column's measured width, which the drag and resize directives snap to. */
  readonly columnWidth = signal(0);

  readonly sources: ModelSources = {
    schemas: this.schemaCache.schemas,
    catalogue: this.operatorCatalogue.asReadonly(),
  };

  // The canvas and placement verbs work on the active tab.
  readonly widgets = computed<readonly WidgetModel[]>(() => this.activeTab()?.widgets() ?? []);
  readonly gridColumns = computed(
    () => this.activeTab()?.gridColumns() ?? TabModel.DEFAULT_GRID_COLUMNS,
  );
  readonly gridRows = computed(() => this.activeTab()?.gridRows() ?? TabModel.DEFAULT_GRID_ROWS);

  setGridColumns(value: number): void {
    this.activeTab()?.setGridColumns(value);
  }

  setGridRows(value: number): void {
    this.activeTab()?.setGridRows(value);
  }

  /** Null if there's no tab to add it to. */
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

  /** Skips any that have since been removed. */
  readonly selectedWidgets = computed<WidgetModel[]>(() => {
    const model = this.model();
    if (!model) return [];
    return this.selection
      .selectedWidgetIds()
      .map((id) => model.widget(id))
      .filter((w): w is WidgetModel => !!w);
  });

  readonly selectedTableWidget = computed<DataTableWidgetModel | null>(() => {
    const widget = this.selectedWidget();
    return widget instanceof DataTableWidgetModel ? widget : null;
  });

  readonly selectedChartWidget = computed<ChartWidgetModel | null>(() => {
    const widget = this.selectedWidget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  readonly selectedKpiWidget = computed<KpiWidgetModel | null>(() => {
    const widget = this.selectedWidget();
    return widget instanceof KpiWidgetModel ? widget : null;
  });

  /** The selected widget, when it has its own filter. */
  readonly selectedFilterableWidget = computed<
    DataTableWidgetModel | PivotTableWidgetModel | KpiWidgetModel | ChartWidgetModel | null
  >(() => {
    const widget = this.selectedWidget();
    return widget instanceof DataTableWidgetModel ||
      widget instanceof PivotTableWidgetModel ||
      widget instanceof KpiWidgetModel ||
      widget instanceof ChartWidgetModel
      ? widget
      : null;
  });

  /**
   * Rebuilds the tree from an undo or redo snapshot. Built through the constructor, not `fromDto`, so
   * it counts as unsaved and is written back.
   */
  restore(report: ReportRevisionContent | null): void {
    if (!report) return;
    this.model.set(new ReportModel(report, this.sources));
    // The tab sync effect reselects the active tab against the rebuilt tabs.

    const present = new Set(report.tabs.flatMap((t) => t.widgets.map((w) => w.id)));
    this.selection.set(this.selection.selectedWidgetIds().filter((id) => present.has(id)));
  }
}
