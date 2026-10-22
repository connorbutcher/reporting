import { PivotAggregate, PivotShowAs } from '../../report';

/** A measure column in the result header — its resolved label and which measure it came from. */
export type PivotMeasureColumn = {
  /** Stable per-result key ("m0", "m1", …) naming the measure's position in the request. */
  key: string;
  label: string;
  columnId: string | null;
  aggregate: PivotAggregate;
  showAs?: PivotShowAs;
};
