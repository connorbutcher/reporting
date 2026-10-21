import { NumericColumnConfig } from '../../../../../../core/models/dataset';
import { ResolvedToleranceBand } from '../../../../../../core/models/widget-query';

export interface BoxTooltipContext {
  config: NumericColumnConfig | undefined;
  horizontal: boolean;
  showMean: boolean;
  showCapability: boolean;
  /** The value-axis spec band capability is measured against, or null. */
  spec: ResolvedToleranceBand | null;
}
