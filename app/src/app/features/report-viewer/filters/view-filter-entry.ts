import { Signal, computed } from '@angular/core';
import { FilterGroup, filterKey } from '../../../core/models/filter';
import { WidgetType } from '../../../core/models/report';
import { FilterGroupModel } from '../../report-builder/models/filter';

/** Session-filter key for one chart binding. */
export function chartBindingKey(widgetId: string, bindingId: string): string {
  return `${widgetId}::${bindingId}`;
}

export function describeConditions(total: number, active: number): string {
  if (total === 0) return 'No conditions';
  // Some switched off: say how many actually narrow the data.
  if (active < total) return `${active} of ${total} active`;
  return `${total} condition${total > 1 ? 's' : ''}`;
}

/** One editable filter in the viewer's panel. */
export interface ViewFilterEntry {
  /** A dataset id (page filter) or widget id (widget filter; chart bindings use {@link chartBindingKey}). */
  readonly key: string;
  readonly datasetId: number;
  readonly group: FilterGroupModel;
  readonly published: FilterGroup | null;
  /** Moved away from what was published. */
  readonly changed: Signal<boolean>;
  /** The finished filter when it differs from published, else undefined: what gets saved or shared. */
  readonly override: Signal<FilterGroup | null | undefined>;
  readonly summary: Signal<string>;
}

export interface PageFilterEntry extends ViewFilterEntry {
  readonly label: Signal<string>;
}

export interface ViewFilterWidget {
  readonly id: string;
  readonly title: string;
  readonly type: WidgetType;
  readonly icon: string;
  readonly tabName: string;
  /** Tells this filter from the widget's others: the series label, else the dataset name. */
  readonly sourceLabel: Signal<string>;
}

export interface WidgetFilterEntry extends ViewFilterEntry {
  readonly widget: ViewFilterWidget;
}

type EntryInit = Pick<ViewFilterEntry, 'key' | 'datasetId' | 'group' | 'published'>;

export function createViewFilterEntry<T extends object>(init: EntryInit & T): ViewFilterEntry & T {
  const { group } = init;
  const publishedKey = filterKey(init.published);
  return {
    ...init,
    changed: computed(() => filterKey(group.toDto()) !== publishedKey),
    override: computed(() => {
      const finished = group.toCompleteDto();
      return filterKey(finished) === publishedKey ? undefined : finished;
    }),
    summary: computed(() => describeConditions(group.count(), group.enabledCount())),
  };
}
