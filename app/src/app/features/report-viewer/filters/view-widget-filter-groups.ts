import { computed } from '@angular/core';
import { WidgetFilterEntry } from './widget-filter-entry';
import { ViewFilterEntryFactory } from './view-filter-entry-factory';
import { ViewWidgetFilters } from './view-widget-filters';
import { Plural } from '../../../shared/text/plural';

/** Groups filter entries by widget, in the order each widget first appears. */
export class ViewWidgetFilterGroups {
  /** Groups entries by widget, in the order each widget first appears. */
  public static group(entries: readonly WidgetFilterEntry[]): ViewWidgetFilters[] {
    const byWidget = new Map<string, WidgetFilterEntry[]>();
    for (const entry of entries) {
      const group = byWidget.get(entry.widget.id);
      if (group) {
        group.push(entry);
      } else {
        byWidget.set(entry.widget.id, [entry]);
      }
    }
    return [...byWidget.values()].map(ViewWidgetFilterGroups.toViewWidgetFilters);
  }

  private static toViewWidgetFilters(entries: WidgetFilterEntry[]): ViewWidgetFilters {
    return {
      widget: entries[0].widget,
      entries,
      options: computed(() => ViewWidgetFilterGroups.optionsFor(entries)),
      changed: computed(() => entries.some((e) => e.changed())),
      summary: computed(() =>
        ViewFilterEntryFactory.summary(
          entries.reduce((n, e) => n + e.group.count(), 0),
          entries.reduce((n, e) => n + e.group.enabledCount(), 0),
        ),
      ),
    };
  }

  /** Each dataset's name with its condition count; a series number where names collide. */
  private static optionsFor(
    entries: readonly WidgetFilterEntry[],
  ): { key: string; label: string }[] {
    const names = entries.map((e) => e.widget.sourceLabel());
    return entries.map((entry, i) => {
      const collides = names.indexOf(names[i]) !== names.lastIndexOf(names[i]);
      const name = collides ? `${names[i]} (series ${i + 1})` : names[i];
      const count = entry.group.count();
      return {
        key: entry.key,
        label: count ? `${name} · ${Plural.count(count, 'condition')}` : name,
      };
    });
  }
}
