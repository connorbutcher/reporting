import { ViewFilterOverrides } from './view-filter-overrides';

export type StartingState = {
  readonly overrides: ViewFilterOverrides;
  readonly fromLink: boolean;
  /** The URL named a link but fetching it failed (not the same as it not existing). */
  readonly lookupFailed: boolean;
};
