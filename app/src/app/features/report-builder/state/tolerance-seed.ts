import { ToleranceMatch } from '../../../core/models/report';

/** The tolerance-pointer fields a saved config or band carries. */
export interface ToleranceSeed {
  readonly sourceDatasetId?: number | null;
  readonly sourceRowId?: string | null;
  /** Only a table column's tolerance can match per row. */
  readonly match?: ToleranceMatch | null;
  readonly minColumnId?: string | null;
  readonly maxColumnId?: string | null;
  readonly concessionLowerColumnId?: string | null;
  readonly concessionUpperColumnId?: string | null;
}
