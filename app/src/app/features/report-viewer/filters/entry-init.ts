import { ViewFilterEntry } from './view-filter-entry';

export type EntryInit = Pick<ViewFilterEntry, 'key' | 'datasetId' | 'group' | 'published'>;
