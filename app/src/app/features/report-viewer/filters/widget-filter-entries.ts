import { Signal, computed, signal } from '@angular/core';
import {
  ChartWidget,
  DataTableWidget,
  bandedChartColumns,
  readChartBindings,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import {
  ViewFilterWidget,
  WidgetFilterEntry,
  chartBindingKey,
  createViewFilterEntry,
} from './view-filter-entry';
import { EntryContext, buildViewFilterGroup } from './view-filter-group';

function describeWidget(
  widget: DataTableWidget | ChartWidget,
  tabName: string,
  sourceLabel: Signal<string>,
): ViewFilterWidget {
  const descriptor = widgetTypeDescriptor(widget.type);
  return {
    id: widget.id,
    title: widget.config.title?.trim() || descriptor.label,
    type: widget.type,
    icon: descriptor.icon,
    tabName,
    sourceLabel,
  };
}

/** A table filters by the columns it shows, and no others. Null when it isn't bound to a dataset. */
export function buildTableEntry(
  widget: DataTableWidget,
  tabName: string,
  ctx: EntryContext,
): WidgetFilterEntry | null {
  const { datasetId, filter } = widget.config;
  if (!datasetId) return null;

  const schema = ctx.schemaFor(datasetId);
  const placed = new Set(widget.config.columns.map((c) => c.columnId));
  const banded = widget.config.columns.filter((c) => c.tolerance).map((c) => c.columnId);
  ctx.addTolerant(datasetId, banded);

  return createViewFilterEntry({
    key: widget.id,
    datasetId,
    published: filter,
    group: buildViewFilterGroup(filter, schema, ctx.catalogue, `view:${widget.id}`, {
      columns: computed(() => (schema()?.columns ?? []).filter((c) => placed.has(c.id))),
      tolerantColumns: signal(new Set(banded)),
    }),
    widget: describeWidget(widget, tabName, computed(() => schema()?.name ?? 'Dataset')),
  });
}

/** A chart overlays one or more datasets; each bound one filters its own rows, so gets its own entry. */
export function buildChartEntries(widget: ChartWidget, tabName: string, ctx: EntryContext): WidgetFilterEntry[] {
  return readChartBindings(widget.config)
    .filter((binding) => binding.datasetId)
    .map((binding) => {
      const datasetId = binding.datasetId!;
      const schema = ctx.schemaFor(datasetId);
      const banded = bandedChartColumns(widget.config.toleranceBands ?? [], binding);
      ctx.addTolerant(datasetId, banded);

      return createViewFilterEntry({
        key: chartBindingKey(widget.id, binding.id),
        datasetId,
        published: binding.filter,
        group: buildViewFilterGroup(
          binding.filter,
          schema,
          ctx.catalogue,
          `view:${widget.id}:${binding.id}`,
          { tolerantColumns: signal(new Set(banded)) },
        ),
        widget: describeWidget(
          widget,
          tabName,
          computed(() => binding.label.trim() || schema()?.name || 'Dataset'),
        ),
      });
    });
}
