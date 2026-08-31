import {
  ChartSeriesBinding,
  ChartToleranceBand,
  ChartValueAxis,
  ChartWidgetConfigBase,
  PRIMARY_AXIS_ID,
} from './chart-config.model';

/** A band is only usable — for a reference line or a tolerance filter — once it points at a spec. */
export function isCompleteToleranceBand(band: ChartToleranceBand): boolean {
  return !!(band.sourceDatasetId && band.sourceRowId && band.minColumnId && band.maxColumnId);
}

/**
 * The binding's axis columns a tolerance filter can key off: an axis column counts only when
 * exactly one complete band targets that axis, so "out of tolerance" resolves to a single spec —
 * mirroring how the server maps bands to axis columns.
 */
export function bandedChartColumns(
  bands: readonly ChartToleranceBand[],
  binding: { xColumnId: string | null; yColumnId: string | null },
): string[] {
  const complete = bands.filter(isCompleteToleranceBand);
  const columns: string[] = [];
  for (const [axis, columnId] of [
    ['x', binding.xColumnId],
    ['y', binding.yColumnId],
  ] as const) {
    if (columnId && complete.filter((b) => b.axis === axis).length === 1) columns.push(columnId);
  }
  return columns;
}

/**
 * The chart's series bindings. A configured chart always carries at least one; the `?? []` only
 * guards a config mid-construction (a fresh chart the model is about to seed).
 */
export function readChartBindings(config: ChartWidgetConfigBase): ChartSeriesBinding[] {
  return config.bindings ?? [];
}

/**
 * The chart's value (Y) axes, normalised: prefers {@link ChartWidgetConfigBase.yAxes}, and for
 * charts saved before multiple axes existed synthesises a single primary axis from the deprecated
 * flat {@link ChartWidgetConfigBase.yAxisLabel}. Always returns at least one axis (id
 * {@link PRIMARY_AXIS_ID} when synthesised), so a null-`yAxisId` binding resolves to it.
 */
export function readChartAxes(config: ChartWidgetConfigBase): ChartValueAxis[] {
  // `yAxes` is required on the type but genuinely absent from reports persisted before it existed.
  if (config.yAxes?.length) return config.yAxes;
  return [{ id: PRIMARY_AXIS_ID, label: config.yAxisLabel ?? '', side: 'left' }];
}

/**
 * Resolves a binding's chosen axis to an index into {@link readChartAxes}. A null `yAxisId`, or
 * one no longer among the chart's axes, falls back to the primary (index 0).
 */
export function chartAxisIndex(axes: readonly ChartValueAxis[], yAxisId: string | null): number {
  if (!yAxisId) return 0;
  const index = axes.findIndex((a) => a.id === yAxisId);
  return index < 0 ? 0 : index;
}

/** A value axis's display name for pickers and legends: its label, else a positional fallback naming its side. */
export function chartAxisDisplayName(axis: ChartValueAxis, index: number): string {
  const label = axis.label.trim();
  if (label) return label;
  return index === 0 ? `Primary (${axis.side})` : `Axis ${index + 1} (${axis.side})`;
}
