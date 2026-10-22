import { Signal, computed, signal } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset';
import { OperatorCatalogue } from '../../../core/models/filter';
import { ReportRevisionContent, Tab, Widget } from '../../../core/models/report';
import { WidgetCatalog } from '../../../core/models/widget-catalog/widget-catalog';
import { PageFilterEntry } from './page-filter-entry';
import { ViewFilterEntries } from './view-filter-entries';
import { ViewFilterEntryContext } from './view-filter-entry-context';
import { ViewFilterEntryFactory } from './view-filter-entry-factory';
import { WidgetFilterEntry } from './widget-filter-entry';
import { WidgetFilterEntryBuilder } from './widget-filter-entry-builder';

/** Every filter a reader can edit: one per widget dataset, and one page filter per dataset in use. */
export class ViewFilterEntryCollector {
  public static collect(
    content: ReportRevisionContent,
    schemas: Signal<Record<number, DatasetSchema>>,
    catalogue: Signal<OperatorCatalogue | null>,
  ): ViewFilterEntries {
    const ctx = new ViewFilterEntryContext(schemas, catalogue);
    const widgetEntries = [...content.tabs]
      .sort((a, b) => a.order - b.order)
      .flatMap((tab) => ViewFilterEntryCollector.tabEntries(tab, ctx));

    // Every dataset in use gets a page filter, so a reader can add one where the author set none.
    const datasetIds = new Set(widgetEntries.map((e) => e.datasetId));
    const pageEntries = [...datasetIds].map((id) =>
      ViewFilterEntryCollector.pageEntry(id, content, ctx),
    );

    return { pageEntries, widgetEntries };
  }

  /** Widgets in grid reading order, so the panel lists them the way a reader scans the canvas. */
  private static tabEntries(tab: Tab, ctx: ViewFilterEntryContext): WidgetFilterEntry[] {
    return [...tab.widgets]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .flatMap((widget) => ViewFilterEntryCollector.widgetEntries(widget, tab.name, ctx));
  }

  private static widgetEntries(
    widget: Widget,
    tabName: string,
    ctx: ViewFilterEntryContext,
  ): WidgetFilterEntry[] {
    if (widget.type === 'dataTable') {
      const entry = WidgetFilterEntryBuilder.table(widget, tabName, ctx);
      return entry ? [entry] : [];
    }
    return WidgetCatalog.isChartWidget(widget)
      ? WidgetFilterEntryBuilder.chart(widget, tabName, ctx)
      : [];
  }

  private static pageEntry(
    datasetId: number,
    content: ReportRevisionContent,
    ctx: ViewFilterEntryContext,
  ): PageFilterEntry {
    const published = content.filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
    const schema = ctx.schemaFor(datasetId);

    return ViewFilterEntryFactory.create({
      key: String(datasetId),
      datasetId,
      published,
      label: computed(() => schema()?.name ?? 'Dataset'),
      group: ctx.buildGroup(published, schema, `page:${datasetId}`, {
        tolerantColumns: signal(new Set(ctx.tolerantColumns(datasetId))),
      }),
    });
  }
}
