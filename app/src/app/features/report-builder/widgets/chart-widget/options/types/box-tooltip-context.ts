import { NumericColumnConfig } from '../../../../../../core/models/dataset';
import { ResolvedToleranceBand } from '../../../../../../core/models/widget-query';

/** What the box tooltip needs beyond the summary: the value formatting and the optional engineering extras. */
export interface BoxTooltipContext {
  config: NumericColumnConfig | undefined;
  horizontal: boolean;
  showMean: boolean;
  showCapability: boolean;
  /** The single value-axis spec band (min & max resolved) capability is measured against, or null. */
  spec: ResolvedToleranceBand | null;
}
