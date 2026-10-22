import { AccessLevel } from '../../permission';

/** A report's identity and folder placement — everything except its content. */
export type ReportSummary = {
  id: number;
  number: number;
  name: string;
  folderId: number | null;
  /**
   * Whether the report has a checked-out draft. The server only ever reports this as true to a
   * caller who can edit the report, so a viewer never learns a draft exists — treat it as an
   * editor-only signal.
   */
  hasDraft: boolean;
  latestVersionNumber: number | null;
  /** The current user's effective access to this report — drives whether editing is offered. */
  accessLevel: AccessLevel;
  /** Whether the current user has starred this report. */
  isFavorite: boolean;
  modifiedAt: string;
};
