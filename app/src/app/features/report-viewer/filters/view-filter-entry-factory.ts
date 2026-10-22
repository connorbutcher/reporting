import { computed } from '@angular/core';
import { EntryInit } from './entry-init';
import { ViewFilterEntry } from './view-filter-entry';
import { FilterTrees } from '../../../core/models/filter';
import { Plural } from '../../../shared/text/plural';

export class ViewFilterEntryFactory {
  /** Session-filter key for one chart binding. */
  public static chartBindingKey(widgetId: string, bindingId: string): string {
    return `${widgetId}::${bindingId}`;
  }

  public static summary(total: number, active: number): string {
    if (total === 0) {
      return 'No conditions';
    }
    // Some switched off: say how many actually narrow the data.
    if (active < total) {
      return `${active} of ${total} active`;
    }
    return Plural.count(total, 'condition');
  }

  public static create<T extends object>(init: EntryInit & T): ViewFilterEntry & T {
    const { group } = init;
    const publishedKey = FilterTrees.key(init.published);
    return {
      ...init,
      changed: computed(() => FilterTrees.key(group.toDto()) !== publishedKey),
      override: computed(() => {
        const finished = group.toCompleteDto();
        return FilterTrees.key(finished) === publishedKey ? undefined : finished;
      }),
      summary: computed(() => ViewFilterEntryFactory.summary(group.count(), group.enabledCount())),
    };
  }
}
