import { AccessLevel } from '../../permission';

/** A report match from a name/number search, with its folder location for display. */
export type ReportSearchResult = {
  id: number;
  number: number;
  name: string;
  /** Editor-only signal — see {@link ReportSummary.hasDraft}. */
  hasDraft: boolean;
  latestVersionNumber: number | null;
  /** The current user's effective access to this report — drives whether editing is offered. */
  accessLevel: AccessLevel;
  /** Whether the current user has starred this report. */
  isFavorite: boolean;
  modifiedAt: string;
  folderPath: string;
};
