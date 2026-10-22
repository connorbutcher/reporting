import { XBarRSubgroup } from '../../../../../../core/models/widget-query';

/** What the subgroup tooltip needs beyond its value: which chart it's on and how to format it. */
export type SubgroupTooltipContext = {
  kind: 'mean' | 'range';
  /** The plotted value's name on this chart (Mean, Value, Range, Std dev, Moving range). */
  valueLabel: string;
  categories: readonly string[];
  subgroups: readonly XBarRSubgroup[];
  /** How this chart's values and limits read: the measure's format, or a percentage on a p chart. */
  format: (value: number) => string;
  centerLine: number;
};
