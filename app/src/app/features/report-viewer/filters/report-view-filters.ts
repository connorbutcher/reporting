import { Signal, computed } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset';
import { FilterGroup, OperatorCatalogue, FilterTrees } from '../../../core/models/filter';
import { ReportRevisionContent } from '../../../core/models/report';
import { ViewFilterEntryCollector } from './view-filter-entry-collector';
import { PageFilterEntry } from './page-filter-entry';
import { ViewFilterEntry } from './view-filter-entry';
import { WidgetFilterEntry } from './widget-filter-entry';
import { ViewFilterOverrides } from './view-filter-overrides';
import { ViewWidgetFilters } from './view-widget-filters';
import { ViewWidgetFilterGroups } from './view-widget-filter-groups';

/**
 * The filters a reader applies to a published report, layered over the author's. Each is an editable
 * copy, so the published revision is never touched. What the reader changed is {@link snapshot}, and
 * comes back through the constructor or {@link apply}.
 */
export class ReportViewFilters {
  public readonly pageEntries: readonly PageFilterEntry[];
  public readonly widgetEntries: readonly WidgetFilterEntry[];
  /** {@link widgetEntries} grouped by widget: one row per widget, not per dataset. */
  public readonly widgetItems: readonly ViewWidgetFilters[];

  /** One computed per entry, so an edit only reloads that entry's widget. */
  public readonly pageFilters: ReadonlyMap<string, Signal<FilterGroup | null>>;
  public readonly widgetFilters: ReadonlyMap<string, Signal<FilterGroup | null>>;

  public readonly changed = computed(() => this.allEntries.some((e) => e.changed()));

  public readonly ready = computed(() => this.allEntries.every((e) => e.group.ready()));

  /** Switched-on conditions across the report: the badge count. */
  public readonly conditionCount = computed(() =>
    this.allEntries.reduce((n, e) => n + e.group.enabledCount(), 0),
  );

  /** Conditions on removed columns, left out of queries. Zero until schemas load. */
  public readonly missingColumnCount = computed(() =>
    this.allEntries.reduce((n, e) => n + e.group.missingColumnCount(), 0),
  );

  /** What the reader changed, to save or share. Page keys (dataset ids) and widget keys (GUIDs) can't collide. */
  public readonly snapshot = computed(() => {
    const overrides: ViewFilterOverrides = {};
    for (const entry of this.allEntries) {
      const override = entry.override();
      if (override !== undefined) {
        overrides[entry.key] = override;
      }
    }
    return overrides;
  });

  private readonly allEntries: readonly ViewFilterEntry[];
  private readonly keys: ReadonlySet<string>;

  constructor(
    content: ReportRevisionContent,
    schemas: Signal<Record<number, DatasetSchema>>,
    catalogue: Signal<OperatorCatalogue | null>,
    overrides: ViewFilterOverrides = {},
  ) {
    const { pageEntries, widgetEntries } = ViewFilterEntryCollector.collect(
      content,
      schemas,
      catalogue,
    );
    this.pageEntries = pageEntries;
    this.widgetEntries = widgetEntries;
    this.widgetItems = ViewWidgetFilterGroups.group(widgetEntries);
    this.allEntries = [...pageEntries, ...widgetEntries];
    this.keys = new Set(this.allEntries.map((e) => e.key));
    this.pageFilters = ReportViewFilters.queryFilters(pageEntries);
    this.widgetFilters = ReportViewFilters.queryFilters(widgetEntries);

    this.apply(overrides);
  }

  private static queryFilters(
    entries: readonly ViewFilterEntry[],
  ): Map<string, Signal<FilterGroup | null>> {
    return new Map(entries.map((e) => [e.key, computed(() => e.group.toQueryDto())]));
  }

  public reset(): void {
    for (const entry of this.allEntries) {
      entry.group.replaceWith(entry.published);
    }
  }

  /** The override keys naming no filter in this version, which {@link apply} ignores. */
  public unmatched(overrides: ViewFilterOverrides): string[] {
    return Object.keys(overrides).filter((key) => !this.keys.has(key));
  }

  /** Sets each filter to its override, or published when absent. Unchanged entries are left alone. */
  public apply(overrides: ViewFilterOverrides): void {
    for (const entry of this.allEntries) {
      const target = Object.hasOwn(overrides, entry.key) ? overrides[entry.key] : entry.published;
      if (FilterTrees.key(target) !== FilterTrees.key(entry.group.toDto())) {
        entry.group.replaceWith(target);
      }
    }
  }

  /** The page-level filter layered on a widget entry, for its live count. */
  public pageFilterFor(entry: ViewFilterEntry): FilterGroup | null {
    return this.pageFilters.get(String(entry.datasetId))?.() ?? null;
  }
}
