import { AccessLevel } from '../../permission';

/** A report's identity and folder placement — everything except its content. */
export type ReportSummary = {
  id: number;
  number: number;
  name: string;
  folderId: number | null;
  /** Only ever true for callers who can edit. */
  hasDraft: boolean;
  latestVersionNumber: number | null;
  /** The current user's effective access to this report — drives whether editing is offered. */
  accessLevel: AccessLevel;
  /** Whether the current user has starred this report. */
  isFavorite: boolean;
  modifiedAt: string;
};
