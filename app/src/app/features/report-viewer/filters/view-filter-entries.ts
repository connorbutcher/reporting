import { Signal, computed, signal } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset';
import { OperatorCatalogue } from '../../../core/models/filter';
import { ReportRevisionContent, Widget } from '../../../core/models/report';
import { isChartWidget } from '../../../core/models/widget-catalog';
import { PageFilterEntry, WidgetFilterEntry, createViewFilterEntry } from './view-filter-entry';
import { EntryContext, buildViewFilterGroup } from './view-filter-group';
import { buildChartEntries, buildTableEntry } from './widget-filter-entries';

export interface ViewFilterEntries {
  readonly pageEntries: PageFilterEntry[];
  readonly widgetEntries: WidgetFilterEntry[];
}

/** Every filter a reader can edit: one per widget dataset, and one page filter per dataset in use. */
export function collectViewFilterEntries(
  content: ReportRevisionContent,
  schemas: Signal<Record<number, DatasetSchema>>,
  catalogue: Signal<OperatorCatalogue | null>,
): ViewFilterEntries {
  const schemaSignals = new Map<number, Signal<DatasetSchema | null>>();
  const tolerantByDataset = new Map<number, Set<string>>();
  const ctx: EntryContext = {
    schemaFor: (id) => {
      let schema = schemaSignals.get(id);
      if (!schema) schemaSignals.set(id, (schema = computed(() => schemas()[id] ?? null)));
      return schema;
    },
    catalogue,
    addTolerant: (id, columnIds) => {
      const set = tolerantByDataset.get(id) ?? new Set<string>();
      for (const columnId of columnIds) set.add(columnId);
      tolerantByDataset.set(id, set);
    },
  };

  // Within a tab, widgets are ordered by grid position — top-to-bottom, then left-to-right within a
  // row — so the filter panel lists them the way a reader would scan the canvas, not creation order.
  const widgetEntries = [...content.tabs]
    .sort((a, b) => a.order - b.order)
    .flatMap((tab) =>
      [...tab.widgets]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .flatMap((widget) => widgetFilterEntries(widget, tab.name, ctx)),
    );

  // A page filter exists for every dataset in use, so a reader can add one where the author set none.
  const datasetIds = new Set(widgetEntries.map((e) => e.datasetId));
  const pageEntries = [...datasetIds].map((id) => buildPageEntry(id, content, ctx, tolerantByDataset.get(id)));

  return { pageEntries, widgetEntries };
}

function widgetFilterEntries(widget: Widget, tabName: string, ctx: EntryContext): WidgetFilterEntry[] {
  if (widget.type === 'dataTable') {
    const entry = buildTableEntry(widget, tabName, ctx);
    return entry ? [entry] : [];
  }
  return isChartWidget(widget) ? buildChartEntries(widget, tabName, ctx) : [];
}

function buildPageEntry(
  datasetId: number,
  content: ReportRevisionContent,
  ctx: EntryContext,
  tolerant: ReadonlySet<string> = new Set(),
): PageFilterEntry {
  const published = content.filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
  const schema = ctx.schemaFor(datasetId);

  return createViewFilterEntry({
    key: String(datasetId),
    datasetId,
    published,
    label: computed(() => schema()?.name ?? 'Dataset'),
    group: buildViewFilterGroup(published, schema, ctx.catalogue, `page:${datasetId}`, {
      tolerantColumns: signal(new Set(tolerant)),
    }),
  });
}
