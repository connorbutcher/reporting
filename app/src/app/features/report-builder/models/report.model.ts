import { Signal, computed, signal } from '@angular/core';
import { ReportRevisionContent, Tab, bandedChartColumns } from '../../../core/models/report';
import { FilterGroup, ReportFilter } from '../../../core/models/filter';
import { EditorNode } from './editor-node';
import { ReportFilterModel } from './filter.model';
import {
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  TabModel,
} from './tab.model';
import { ChartWidgetModel, DataTableWidgetModel, ModelSources, WidgetModel } from './widget.model';
import { ValidationIssue } from './validation-issue';

// Re-exported so the store and settings panel keep importing the grid defaults
// from here, unaware they now originate on the tab.
export { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS } from './tab.model';

/**
 * The report being edited. Owns its tabs, the report-level filters, and the name.
 * Grid geometry and widgets live on each {@link TabModel}; the report proxies the
 * widget/grid operations through to whichever tab is active, so callers that used
 * to talk to the single-surface report keep working unchanged.
 */
export class ReportModel extends EditorNode {
  readonly reportId: number;
  readonly name = signal('');

  readonly tabs = signal<readonly TabModel[]>([]);
  readonly activeTabId = signal<string | null>(null);

  /** The tab the canvas shows and every placement operation targets. */
  readonly activeTab = computed<TabModel | null>(() => {
    const tabs = this.tabs();
    return tabs.find((t) => t.id === this.activeTabId()) ?? tabs[0] ?? null;
  });

  /** Report-level filters, one per dataset, layered over each widget's own. */
  readonly filters = signal<readonly ReportFilterModel[]>([]);

  /** Issues grouped by widget, so each one can show its own badge cheaply. */
  readonly issuesByWidget: Signal<Map<string, ValidationIssue[]>>;

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
    // Which tab is active is driven by the route's `tab` param (see ReportSession),
    // so it's left unset here; `activeTab` falls back to the first tab until then.

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

  static fromDto(report: ReportRevisionContent, sources: ModelSources): ReportModel {
    const model = new ReportModel(report, sources);
    // Freshly loaded state is by definition the saved state.
    model.markPristine();
    return model;
  }

  // --- cross-tab widget lookup & mutation ------------------------------------
  // Per-tab reads (widgets, grid) and adding a widget target the *active* tab, so
  // they live on ReportSession, which owns the active tab. What stays here spans
  // tabs: resolving a widget wherever it lives, and routing an edit to its tab.

  removeWidget(widgetId: string): void {
    this.tabOf(widgetId)?.removeWidget(widgetId);
  }

  removeWidgets(widgetIds: readonly string[]): void {
    for (const id of widgetIds) this.tabOf(id)?.removeWidget(id);
  }

  duplicateWidget(widgetId: string): WidgetModel | null {
    return this.tabOf(widgetId)?.duplicateWidget(widgetId) ?? null;
  }

  /** Any widget across every tab, so the panel resolves a selection wherever it lives. */
  widget(widgetId: string): WidgetModel | null {
    for (const tab of this.tabs()) {
      const found = tab.widget(widgetId);
      if (found) return found;
    }
    return null;
  }

  /** The tab a widget belongs to, or null if it isn't on any. */
  tabOf(widgetId: string): TabModel | null {
    return this.tabs().find((t) => t.widget(widgetId)) ?? null;
  }

  /** Siblings on the same tab as the given widget, for collision checks while dragging/resizing. */
  siblingsOf(widgetId: string): readonly WidgetModel[] {
    return this.tabOf(widgetId)?.siblingsOf(widgetId) ?? [];
  }

  // --- tab lifecycle ---------------------------------------------------------

  setActiveTab(tabId: string): void {
    if (this.tabs().some((t) => t.id === tabId)) this.activeTabId.set(tabId);
  }

  /**
   * Adds an empty tab after the last one and returns it. Making it the active tab
   * is the caller's job (it navigates the `tab` query param — see TabCommands).
   */
  addTab(): TabModel {
    const order = this.tabs().reduce((max, t) => Math.max(max, t.order()), -1) + 1;
    const dto: Tab = {
      id: crypto.randomUUID(),
      name: `Tab ${this.tabs().length + 1}`,
      order,
      columns: DEFAULT_GRID_COLUMNS,
      rows: DEFAULT_GRID_ROWS,
      widgets: [],
    };
    const tab = new TabModel(dto, this.sources);
    this.tabs.update((tabs) => [...tabs, tab]);
    return tab;
  }

  /**
   * Removes a tab, refusing to drop the last one. Reselecting a survivor is the
   * caller's job when the active tab went (the route's `tab` param drives it).
   */
  removeTab(tabId: string): void {
    const tabs = this.tabs();
    if (tabs.length <= 1) return;
    if (!tabs.some((t) => t.id === tabId)) return;

    const next = tabs.filter((t) => t.id !== tabId);
    this.renumber(next);
    this.tabs.set(next);
  }

  renameTab(tabId: string, name: string): void {
    this.tabs()
      .find((t) => t.id === tabId)
      ?.name.set(name);
  }

  /** Moves a tab to a new position and renumbers every tab's order to match. */
  moveTab(tabId: string, toIndex: number): void {
    const tabs = [...this.tabs()];
    const from = tabs.findIndex((t) => t.id === tabId);
    if (from < 0) return;

    const clamped = Math.max(0, Math.min(toIndex, tabs.length - 1));
    const [moved] = tabs.splice(from, 1);
    tabs.splice(clamped, 0, moved);
    this.renumber(tabs);
    this.tabs.set(tabs);
  }

  /** Rewrites each tab's `order` to its position in the list. */
  private renumber(tabs: readonly TabModel[]): void {
    tabs.forEach((tab, index) => tab.order.set(index));
  }

  // --- report-level filters -------------------------------------------------

  /** Every dataset some table/chart across any tab is bound to, in first-use order. */
  readonly usedDatasetIds = computed(() => {
    const ids: number[] = [];
    for (const tab of this.tabs()) {
      for (const widget of tab.widgets()) {
        if (!(widget instanceof DataTableWidgetModel) && !(widget instanceof ChartWidgetModel))
          continue;
        const id = widget.datasetId();
        if (id && !ids.includes(id)) ids.push(id);
      }
    }
    return ids;
  });

  reportFilter(datasetId: number): ReportFilterModel | null {
    return this.filters().find((f) => f.datasetId === datasetId) ?? null;
  }

  /** The filter for a dataset, created on first use so the panel always has one to edit. */
  ensureReportFilter(datasetId: number): ReportFilterModel {
    const existing = this.reportFilter(datasetId);
    if (existing) return existing;

    const model = this.buildReportFilter(datasetId, null);
    this.filters.update((filters) => [...filters, model]);
    return model;
  }

  private buildReportFilter(datasetId: number, dto: FilterGroup | null): ReportFilterModel {
    return new ReportFilterModel(datasetId, dto, {
      schema: computed(() => this.sources.schemas()[datasetId] ?? null),
      catalogue: this.sources.catalogue,
      // A page filter isn't tied to one widget, so its tolerance operators are offered on
      // any column banded by a widget in the report that draws on this dataset.
      tolerantColumns: computed(() => this.tolerantColumnsFor(datasetId)),
      view: { kind: 'reportFilters' },
      ownerId: `report:${datasetId}`,
    });
  }

  /** Every column banded (table banding or a chart's single-band axis) by a widget on this dataset. */
  private tolerantColumnsFor(datasetId: number): ReadonlySet<string> {
    const columns = new Set<string>();
    for (const tab of this.tabs()) {
      for (const widget of tab.widgets()) {
        if (widget instanceof DataTableWidgetModel) {
          if (widget.datasetId() !== datasetId) continue;
          for (const column of widget.columns()) {
            if (column.tolerance()) columns.add(column.columnId);
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

  toDto(): ReportRevisionContent {
    return {
      reportId: this.reportId,
      name: this.name(),
      tabs: this.tabs().map((t) => t.toDto()),
      // Notes only ever exist on published versions; a draft's autosave payload never carries one.
      notes: null,
      filters: this.filters()
        .map((f) => f.toDto())
        .filter((f): f is ReportFilter => f !== null),
    };
  }

  /**
   * The whole report serialized, memoized so it recomputes once per change and is
   * shared between the dirty check ({@link serialize}) and the undo stack / autosave
   * — a large report would otherwise be JSON-stringified several times per edit.
   */
  readonly serialized = computed(() => JSON.stringify(this.toDto()));

  protected override serialize(): string {
    return this.serialized();
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return [...this.tabs(), ...this.filters()];
  }

  protected override ownIssues(): ValidationIssue[] {
    // Grid/overlap issues belong to each tab; the report itself raises none.
    return [];
  }
}
