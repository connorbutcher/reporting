import { Signal, computed } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../core/models/dataset';
import { FilterGroup, OperatorCatalogue, filterKey } from '../../core/models/filter';
import { ReportRevisionContent, WidgetType, readChartBindings } from '../../core/models/report';
import { isChartWidget, widgetTypeDescriptor } from '../../core/models/widget-catalog';
import { FilterGroupModel } from '../report-builder/models/filter.model';

/** The session-filter map key for one chart binding — a widget id plus its binding id. */
export function chartBindingKey(widgetId: string, bindingId: string): string {
  return `${widgetId}::${bindingId}`;
}

/** One editable filter shown in the viewer's panel. */
export interface ViewFilterEntry {
  /** The map key: a dataset id (stringified) for page filters, a widget id for widget filters. */
  readonly key: string;
  readonly label: Signal<string>;
  readonly datasetId: number;
  readonly group: FilterGroupModel;
  /** What the published report defines, for detecting and restoring changes. */
  readonly published: FilterGroup | null;
  /** Undefined for a page filter — it isn't any one widget's. */
  readonly type?: WidgetType;
  /** PrimeIcons class for the widget kind. Undefined for a page filter. */
  readonly icon?: string;
}

/**
 * The filters a viewer is applying to a published report *for this session only*.
 *
 * Every filter the author defined — page-level and per-widget — is seeded here as
 * an editable copy, so a reader can see the scope they're looking at and narrow
 * it further. Nothing written here reaches the server: the published revision is
 * immutable, and reloading restores the author's definition.
 */
export class ReportViewFilters {
  readonly pageEntries: readonly ViewFilterEntry[];
  readonly widgetEntries: readonly ViewFilterEntry[];

  /**
   * Each entry's resolved filter, memoized per key. A `Record` rebuilt from
   * every entry on any single edit would hand *every* widget a fresh object
   * reference whenever *any* filter changed, and each widget treats a new
   * filter reference as "reload me" — so one edit would reload the whole
   * report. Keying a per-entry `computed()` instead means editing one filter
   * only invalidates that filter's own signal.
   */
  readonly pageFilters: ReadonlyMap<string, Signal<FilterGroup | null>>;
  readonly widgetFilters: ReadonlyMap<string, Signal<FilterGroup | null>>;

  constructor(
    content: ReportRevisionContent,
    schemas: Signal<Record<number, DatasetSchema>>,
    catalogue: Signal<OperatorCatalogue | null>,
  ) {
    const schemaFor = (datasetId: number) => computed(() => schemas()[datasetId] ?? null);

    // A page filter exists for every dataset in use, not only those the author
    // filtered — otherwise a reader couldn't add one where none was defined.
    const datasetIds = new Set<number>();
    const widgetEntries: ViewFilterEntry[] = [];

    // Filters are report-wide, so every tab's widgets contribute their entries.
    for (const widget of content.tabs.flatMap((t) => t.widgets)) {
      if (widget.type === 'dataTable') {
        const datasetId = widget.config.datasetId;
        if (!datasetId) continue;
        datasetIds.add(datasetId);
        const schema = schemaFor(datasetId);
        const title = widget.config.title?.trim() || widgetTypeDescriptor(widget.type).label;
        // A table only offers the columns it shows — filtering it by a column that
        // isn't on it would silently drop rows for a reason the reader can't see.
        const placed = new Set(widget.config.columns.map((c) => c.columnId));
        const columns = computed(() => (schema()?.columns ?? []).filter((c) => placed.has(c.id)));
        widgetEntries.push({
          key: widget.id,
          label: computed(() => title),
          datasetId,
          published: widget.config.filter,
          group: buildGroup(widget.config.filter, schema, catalogue, `view:${widget.id}`, columns),
          type: widget.type,
          icon: widgetTypeDescriptor(widget.type).icon,
        });
      } else if (isChartWidget(widget)) {
        // A chart overlays one or more datasets; each bound binding filters its own
        // rows, so each gets its own entry. A chart has no fixed column set, so its
        // filter offers the whole dataset.
        const bound = readChartBindings(widget.config).filter((b) => b.datasetId);
        const title = widget.config.title?.trim() || widgetTypeDescriptor(widget.type).label;
        const multi = bound.length > 1;
        for (const binding of bound) {
          const datasetId = binding.datasetId!;
          datasetIds.add(datasetId);
          const schema = schemaFor(datasetId);
          widgetEntries.push({
            key: chartBindingKey(widget.id, binding.id),
            label: computed(() =>
              multi ? `${title} · ${binding.label.trim() || schema()?.name || 'Dataset'}` : title,
            ),
            datasetId,
            published: binding.filter,
            group: buildGroup(binding.filter, schema, catalogue, `view:${widget.id}:${binding.id}`),
            type: widget.type,
            icon: widgetTypeDescriptor(widget.type).icon,
          });
        }
      }
    }

    this.pageEntries = [...datasetIds].map((datasetId) => {
      const published = content.filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
      const schema = schemaFor(datasetId);
      return {
        key: String(datasetId),
        label: computed(() => schema()?.name ?? 'Dataset'),
        datasetId,
        published,
        group: buildGroup(published, schema, catalogue, `page:${datasetId}`),
      };
    });

    this.widgetEntries = widgetEntries;

    // Built after pageEntries/widgetEntries exist — each computed() closes over
    // one entry, so reading it only tracks that entry's own group signals.
    this.pageFilters = new Map(
      this.pageEntries.map((e) => [e.key, computed(() => e.group.toQueryDto())]),
    );
    this.widgetFilters = new Map(
      this.widgetEntries.map((e) => [e.key, computed(() => e.group.toQueryDto())]),
    );
  }

  private get allEntries(): ViewFilterEntry[] {
    return [...this.pageEntries, ...this.widgetEntries];
  }

  /** True once the reader's view differs from what the author published. */
  readonly changed = computed(() => this.allEntries.some((e) => entryChanged(e)));

  readonly conditionCount = computed(() =>
    this.allEntries.reduce((n, e) => n + e.group.count(), 0),
  );

  /** Puts every filter back to what the published report defines. */
  reset(): void {
    for (const entry of this.allEntries) entry.group.replaceWith(entry.published);
  }
}

function buildGroup(
  published: FilterGroup | null,
  schema: Signal<DatasetSchema | null>,
  catalogue: Signal<OperatorCatalogue | null>,
  ownerId: string,
  columns?: Signal<DatasetColumn[]>,
): FilterGroupModel {
  // Deep-copied so editing never mutates the published revision held in the
  // content signal, which is what reset() restores from.
  return new FilterGroupModel(clone(published), { schema, catalogue, ownerId, columns });
}

function clone(filter: FilterGroup | null): FilterGroup | null {
  return filter ? (JSON.parse(JSON.stringify(filter)) as FilterGroup) : null;
}

/** Whether a reader has moved this filter away from what the author published. */
export function entryChanged(entry: ViewFilterEntry): boolean {
  return filterKey(entry.group.toDto()) !== filterKey(entry.published);
}
