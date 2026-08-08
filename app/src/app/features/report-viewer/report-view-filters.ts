import { Signal, computed } from '@angular/core';
import { DatasetSchema } from '../../core/models/dataset.model';
import { FilterGroup, OperatorCatalogue, filterKey } from '../../core/models/filter.model';
import { ReportRevisionContent, Widget } from '../../core/models/report.model';
import { FilterGroupModel } from '../report-builder/models/filter.model';

/** One editable filter shown in the viewer's panel. */
export interface ViewFilterEntry {
  /** A dataset id for page filters, a widget id for table filters. */
  readonly key: string;
  readonly label: Signal<string>;
  readonly datasetId: string;
  readonly group: FilterGroupModel;
  /** What the published report defines, for detecting and restoring changes. */
  readonly published: FilterGroup | null;
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

  constructor(
    content: ReportRevisionContent,
    schemas: Signal<Record<string, DatasetSchema>>,
    catalogue: Signal<OperatorCatalogue | null>,
  ) {
    const schemaFor = (datasetId: string) => computed(() => schemas()[datasetId] ?? null);

    const tables = content.widgets.filter(
      (w): w is Extract<Widget, { type: 'dataTable' }> =>
        w.type === 'dataTable' && !!w.config.datasetId,
    );

    // A page filter exists for every dataset in use, not only those the author
    // filtered — otherwise a reader couldn't add one where none was defined.
    const datasetIds = [...new Set(tables.map((w) => w.config.datasetId!))];

    this.pageEntries = datasetIds.map((datasetId) => {
      const published = content.filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
      const schema = schemaFor(datasetId);
      return {
        key: datasetId,
        label: computed(() => schema()?.name ?? 'Dataset'),
        datasetId,
        published,
        group: buildGroup(published, schema, catalogue, `page:${datasetId}`),
      };
    });

    this.widgetEntries = tables.map((widget) => {
      const datasetId = widget.config.datasetId!;
      const title = widget.config.title?.trim() || 'Table';
      return {
        key: widget.id,
        label: computed(() => title),
        datasetId,
        published: widget.config.filter,
        group: buildGroup(widget.config.filter, schemaFor(datasetId), catalogue, `view:${widget.id}`),
      };
    });
  }

  private get allEntries(): ViewFilterEntry[] {
    return [...this.pageEntries, ...this.widgetEntries];
  }

  // These read through the models' signals, so editing a condition recomputes
  // them and re-runs the affected widget's query automatically.

  readonly pageFilters = computed<Record<string, FilterGroup | null>>(() =>
    Object.fromEntries(this.pageEntries.map((e) => [e.key, e.group.toQueryDto()])),
  );

  readonly widgetFilters = computed<Record<string, FilterGroup | null>>(() =>
    Object.fromEntries(this.widgetEntries.map((e) => [e.key, e.group.toQueryDto()])),
  );

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
): FilterGroupModel {
  // Deep-copied so editing never mutates the published revision held in the
  // content signal, which is what reset() restores from.
  return new FilterGroupModel(clone(published), { schema, catalogue, ownerId });
}

function clone(filter: FilterGroup | null): FilterGroup | null {
  return filter ? (JSON.parse(JSON.stringify(filter)) as FilterGroup) : null;
}

/** Whether a reader has moved this filter away from what the report published. */
export function entryChanged(entry: ViewFilterEntry): boolean {
  return filterKey(entry.group.toDto()) !== filterKey(entry.published);
}
