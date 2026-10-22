/** What the fake server holds. */
export type FakeServer = {
  saved: string | null;
  /** The report publishes a page filter on dataset 7 whose condition is missing its value. */
  publishedBlankFilter?: boolean;
  /** Shared snapshots by short id. */
  views: Record<string, string>;
  /** Loading the reader's saved filters fails (a 500). */
  failSaved?: boolean;
  /** Loading any shared link fails (a 500), as opposed to the link not existing. */
  failViews?: boolean;
};
