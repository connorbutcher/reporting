import { AccessLevel } from '../../permission/index';

/** The minimal report identity the open logic needs — satisfied by both ReportSummary and ReportSearchResult. */
export type OpenableReport = {
  id: number;
  hasDraft: boolean;
  latestVersionNumber: number | null;
  accessLevel: AccessLevel;
};
