import { Signal, computed } from '@angular/core';
import { ViewFilterWidget, WidgetFilterEntry, describeConditions } from './view-filter-entry';

/** One widget as the panel lists it: several entries only for a chart overlaying several datasets. */
export interface ViewWidgetFilters {
  readonly widget: ViewFilterWidget;
  /** Never empty. */
  readonly entries: readonly WidgetFilterEntry[];
  /** The dataset picker's choices. */
  readonly options: Signal<{ key: string; label: string }[]>;
  readonly changed: Signal<boolean>;
  /** Across all the widget's datasets, so a collapsed row never hides that one is filtered. */
  readonly summary: Signal<string>;
}

/** Groups entries by widget, in the order each widget first appears. */
export function groupWidgetEntries(entries: readonly WidgetFilterEntry[]): ViewWidgetFilters[] {
  const byWidget = new Map<string, WidgetFilterEntry[]>();
  for (const entry of entries) {
    const group = byWidget.get(entry.widget.id);
    if (group) group.push(entry);
    else byWidget.set(entry.widget.id, [entry]);
  }
  return [...byWidget.values()].map(toViewWidgetFilters);
}

function toViewWidgetFilters(entries: WidgetFilterEntry[]): ViewWidgetFilters {
  return {
    widget: entries[0].widget,
    entries,
    options: computed(() => optionsFor(entries)),
    changed: computed(() => entries.some((e) => e.changed())),
    summary: computed(() =>
      describeConditions(
        entries.reduce((n, e) => n + e.group.count(), 0),
        entries.reduce((n, e) => n + e.group.enabledCount(), 0),
      ),
    ),
  };
}

/** Each dataset's name with its condition count; a series number where names collide. */
function optionsFor(entries: readonly WidgetFilterEntry[]): { key: string; label: string }[] {
  const names = entries.map((e) => e.widget.sourceLabel());
  return entries.map((entry, i) => {
    const collides = names.indexOf(names[i]) !== names.lastIndexOf(names[i]);
    const name = collides ? `${names[i]} (series ${i + 1})` : names[i];
    const count = entry.group.count();
    return { key: entry.key, label: count ? `${name} · ${count} condition${count > 1 ? 's' : ''}` : name };
  });
}
