import { FilterGroup } from '../../../core/models/filter';

/** What a reader changed from the published filters, by entry key. `null` is a filter they cleared; untouched entries are absent. */
export type ViewFilterOverrides = Record<string, FilterGroup | null>;
