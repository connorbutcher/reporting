import { Signal, computed, signal } from '@angular/core';
import {
  ChartConfigs,
  ChartSeriesBinding,
  ChartWidget,
  DataTableWidget,
  ToleranceConfigs,
} from '../../../core/models/report';
import { WidgetCatalog } from '../../../core/models/widget-catalog/widget-catalog';
import { ViewFilterEntryContext } from './view-filter-entry-context';
import { ViewFilterEntryFactory } from './view-filter-entry-factory';
import { ViewFilterWidget } from './view-filter-widget';
import { WidgetFilterEntry } from './widget-filter-entry';

/** Builds the filter entries a reader can edit on one widget. */
export class WidgetFilterEntryBuilder {
  /** A table filters by the columns it shows, and no others. Null when it isn't bound to a dataset. */
  public static table(
    widget: DataTableWidget,
    tabName: string,
    ctx: ViewFilterEntryContext,
  ): WidgetFilterEntry | null {
    const { datasetId, filter } = widget.config;
    if (!datasetId) {
      return null;
    }

    const schema = ctx.schemaFor(datasetId);
    const placed = new Set(widget.config.columns.map((c) => c.columnId));
    const banded = widget.config.columns
      .filter((c) => ToleranceConfigs.hasFixedLimits(c.tolerance))
      .map((c) => c.columnId);
    ctx.addTolerant(datasetId, banded);

    return ViewFilterEntryFactory.create({
      key: widget.id,
      datasetId,
      published: filter,
      group: ctx.buildGroup(filter, schema, `view:${widget.id}`, {
        columns: computed(() => (schema()?.columns ?? []).filter((c) => placed.has(c.id))),
        tolerantColumns: signal(new Set(banded)),
      }),
      widget: WidgetFilterEntryBuilder.describe(
        widget,
        tabName,
        computed(() => schema()?.name ?? 'Dataset'),
      ),
    });
  }

  /** A chart overlays one or more datasets; each bound one filters its own rows, so gets its own entry. */
  public static chart(
    widget: ChartWidget,
    tabName: string,
    ctx: ViewFilterEntryContext,
  ): WidgetFilterEntry[] {
    return ChartConfigs.bindings(widget.config)
      .filter((binding) => binding.datasetId)
      .map((binding) => WidgetFilterEntryBuilder.binding(widget, binding, tabName, ctx));
  }

  private static binding(
    widget: ChartWidget,
    binding: ChartSeriesBinding,
    tabName: string,
    ctx: ViewFilterEntryContext,
  ): WidgetFilterEntry {
    const datasetId = binding.datasetId!;
    const schema = ctx.schemaFor(datasetId);
    const banded = ChartConfigs.bandedColumns(widget.config.toleranceBands ?? [], binding);
    ctx.addTolerant(datasetId, banded);

    return ViewFilterEntryFactory.create({
      key: ViewFilterEntryFactory.chartBindingKey(widget.id, binding.id),
      datasetId,
      published: binding.filter,
      group: ctx.buildGroup(binding.filter, schema, `view:${widget.id}:${binding.id}`, {
        tolerantColumns: signal(new Set(banded)),
      }),
      widget: WidgetFilterEntryBuilder.describe(
        widget,
        tabName,
        computed(() => binding.label.trim() || schema()?.name || 'Dataset'),
      ),
    });
  }

  private static describe(
    widget: DataTableWidget | ChartWidget,
    tabName: string,
    sourceLabel: Signal<string>,
  ): ViewFilterWidget {
    const descriptor = WidgetCatalog.descriptor(widget.type);
    return {
      id: widget.id,
      title: widget.config.title?.trim() || descriptor.label,
      type: widget.type,
      icon: descriptor.icon,
      tabName,
      sourceLabel,
    };
  }
}
