/** What the banner says about a shared link's filters the reader hasn't yet made their own. */
export interface SharedLinkState {
  /** Filters the link carried, one per filtered widget dataset or page dataset. */
  readonly total: number;
  /** Of those, how many name a widget or dataset this version lacks, so were left out. */
  readonly unmatched: number;
  /** Applied conditions testing a removed column, so left out of queries. Zero until schemas load. */
  readonly missingColumns: number;
}
