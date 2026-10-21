import { Signal, computed, signal } from '@angular/core';
import {
  ReportRevisionContent,
  Tab,
  bandedChartColumns,
  hasFixedLimits,
} from '../../../core/models/report';
import { FilterGroup, ReportFilter } from '../../../core/models/filter';
import { EditorNode } from './editor-node';
import { ReportFilterModel } from './filter';
import { TabModel } from './tab.model';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  KpiWidgetModel,
  PivotTableWidgetModel,
  WidgetModel,
} from './widget.model';
import { ValidationIssue } from './validation-issue';
import { ModelSources } from './sources/model-sources';

/**
 * The report being edited: its tabs, report-level filters and name. Grid geometry and widgets
 * live on each {@link TabModel}.
 */
export class ReportModel extends EditorNode {
  public readonly reportId: number;
  public readonly name = signal('');
  public readonly tabs = signal<readonly TabModel[]>([]);
  public readonly activeTabId = signal<string | null>(null);

  public readonly activeTab = computed<TabModel | null>(() => {
    const tabs = this.tabs();
    return tabs.find((t) => t.id === this.activeTabId()) ?? tabs[0] ?? null;
  });

  /** One filter per dataset, layered over each widget's own. */
  public readonly filters = signal<readonly ReportFilterModel[]>([]);
  public readonly issuesByWidget: Signal<Map<string, ValidationIssue[]>>;

  /**
   * Every dataset a filterable widget uses, across all tabs, in first-use order. Includes every chart
   * binding, since {@link WidgetHostComponent} layers a dataset's report filter under each binding.
   */
  public readonly usedDatasetIds = computed(() => {
    const ids = this.tabs()
      .flatMap((tab) => tab.widgets())
      .flatMap((widget) => ReportModel.datasetIdsOf(widget))
      .filter((id): id is number => !!id);
    return [...new Set(ids)];
  });

  /** Memoized so the dirty check, undo stack and autosave share one JSON.stringify per edit. */
  public readonly serialized = computed(() => JSON.stringify(this.toDto()));

  constructor(
    report: ReportRevisionContent,
    private readonly sources: ModelSources,
  ) {
    super();
    this.reportId = report.reportId;
    this.name.set(report.name);

    const tabs = [...report.tabs]
      .sort((a, b) => a.order - b.order)
      .map((t) => new TabModel(t, sources));
    this.tabs.set(tabs);
    // The route's `tab` param picks the active tab (see ReportSession); until then `activeTab` falls back to the first.

    this.filters.set(
      (report.filters ?? []).map((f) => this.buildReportFilter(f.datasetId, f.filter)),
    );

    this.issuesByWidget = computed(() => {
      const map = new Map<string, ValidationIssue[]>();
      for (const issue of this.issues()) {
        if (!issue.widgetId) continue;
        const list = map.get(issue.widgetId);
        if (list) list.push(issue);
        else map.set(issue.widgetId, [issue]);
      }
      return map;
    });
  }

  public static fromDto(report: ReportRevisionContent, sources: ModelSources): ReportModel {
    const model = new ReportModel(report, sources);
    model.markPristine();
    return model;
  }

  /** A chart filters every binding's dataset; a table, pivot or KPI its one dataset. */
  private static datasetIdsOf(widget: WidgetModel): (number | null)[] {
    if (widget instanceof ChartWidgetModel) return widget.bindings().map((b) => b.datasetId());
    if (
      widget instanceof DataTableWidgetModel ||
      widget instanceof PivotTableWidgetModel ||
      widget instanceof KpiWidgetModel
    ) {
      return [widget.datasetId()];
    }
    return [];
  }

  public removeWidget(widgetId: string): void {
    this.tabOf(widgetId)?.removeWidget(widgetId);
  }

  public removeWidgets(widgetIds: readonly string[]): void {
    for (const id of widgetIds) this.tabOf(id)?.removeWidget(id);
  }

  public duplicateWidget(widgetId: string): WidgetModel | null {
    return this.tabOf(widgetId)?.duplicateWidget(widgetId) ?? null;
  }

  /** Finds a widget on any tab. */
  public widget(widgetId: string): WidgetModel | null {
    for (const tab of this.tabs()) {
      const found = tab.widget(widgetId);
      if (found) return found;
    }
    return null;
  }

  public tabOf(widgetId: string): TabModel | null {
    return this.tabs().find((t) => t.widget(widgetId)) ?? null;
  }

  /** Same-tab siblings, for collision checks while dragging or resizing. */
  public siblingsOf(widgetId: string): readonly WidgetModel[] {
    return this.tabOf(widgetId)?.siblingsOf(widgetId) ?? [];
  }

  public setActiveTab(tabId: string): void {
    if (this.tabs().some((t) => t.id === tabId)) this.activeTabId.set(tabId);
  }

  /** Adds an empty tab at the end; the caller makes it active by navigating the `tab` query param. */
  public addTab(): TabModel {
    const order = this.tabs().reduce((max, t) => Math.max(max, t.order()), -1) + 1;
    const dto: Tab = {
      id: crypto.randomUUID(),
      name: `Tab ${this.tabs().length + 1}`,
      order,
      columns: TabModel.DEFAULT_GRID_COLUMNS,
      rows: TabModel.DEFAULT_GRID_ROWS,
      widgets: [],
    };
    const tab = new TabModel(dto, this.sources);
    this.tabs.update((tabs) => [...tabs, tab]);
    return tab;
  }

  /** Removes a tab unless it's the last; the caller reselects a survivor if the active tab went. */
  public removeTab(tabId: string): void {
    const tabs = this.tabs();
    if (tabs.length <= 1) return;
    if (!tabs.some((t) => t.id === tabId)) return;

    const next = tabs.filter((t) => t.id !== tabId);
    this.renumber(next);
    this.tabs.set(next);
  }

  public renameTab(tabId: string, name: string): void {
    this.tabs()
      .find((t) => t.id === tabId)
      ?.name.set(name);
  }

  public moveTab(tabId: string, toIndex: number): void {
    const tabs = [...this.tabs()];
    const from = tabs.findIndex((t) => t.id === tabId);
    if (from < 0) return;

    const clamped = Math.max(0, Math.min(toIndex, tabs.length - 1));
    const [moved] = tabs.splice(from, 1);
    tabs.splice(clamped, 0, moved);
    this.renumber(tabs);
    this.tabs.set(tabs);
  }

  public reportFilter(datasetId: number): ReportFilterModel | null {
    return this.filters().find((f) => f.datasetId === datasetId) ?? null;
  }

  /** Created on first use so the panel always has a filter to edit. */
  public ensureReportFilter(datasetId: number): ReportFilterModel {
    const existing = this.reportFilter(datasetId);
    if (existing) return existing;

    const model = this.buildReportFilter(datasetId, null);
    this.filters.update((filters) => [...filters, model]);
    return model;
  }

  public toDto(): ReportRevisionContent {
    return {
      reportId: this.reportId,
      name: this.name(),
      tabs: this.tabs().map((t) => t.toDto()),
      // Notes only exist on published versions.
      notes: null,
      filters: this.filters()
        .map((f) => f.toDto())
        .filter((f): f is ReportFilter => f !== null),
    };
  }

  public override serialize(): string {
    return this.serialized();
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return [...this.tabs(), ...this.filters()];
  }

  public override ownIssues(): ValidationIssue[] {
    // Grid and overlap issues belong to each tab.
    return [];
  }

  private renumber(tabs: readonly TabModel[]): void {
    tabs.forEach((tab, index) => tab.order.set(index));
  }

  private buildReportFilter(datasetId: number, dto: FilterGroup | null): ReportFilterModel {
    return new ReportFilterModel(datasetId, dto, {
      schema: computed(() => this.sources.schemas()[datasetId] ?? null),
      catalogue: this.sources.catalogue,
      // A page filter isn't tied to one widget, so tolerance operators are offered on any column a
      // widget on this dataset bands.
      tolerantColumns: computed(() => this.tolerantColumnsFor(datasetId)),
      view: { kind: 'reportFilters' },
      ownerId: `report:${datasetId}`,
    });
  }

  /** Columns banded by a table or a chart's single-band axis on this dataset. */
  private tolerantColumnsFor(datasetId: number): ReadonlySet<string> {
    const columns = new Set<string>();
    for (const tab of this.tabs()) {
      for (const widget of tab.widgets()) {
        if (widget instanceof DataTableWidgetModel) {
          if (widget.datasetId() !== datasetId) continue;
          for (const column of widget.columns()) {
            if (hasFixedLimits(column.tolerance())) columns.add(column.columnId);
          }
        } else if (widget instanceof ChartWidgetModel) {
          const bands = widget.toleranceBands();
          for (const binding of widget.bindings()) {
            if (binding.datasetId() !== datasetId) continue;
            for (const id of bandedChartColumns(bands, {
              xColumnId: binding.xColumnId(),
              yColumnId: binding.yColumnId(),
            })) {
              columns.add(id);
            }
          }
        }
      }
    }
    return columns;
  }
}
