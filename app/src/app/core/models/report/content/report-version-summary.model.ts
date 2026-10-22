export type ReportVersionSummary = {
  versionNumber: number;
  publishedAt: string;
  /** Rich-text (HTML) description of what changed in this version, entered when publishing. */
  notes: string | null;
};
