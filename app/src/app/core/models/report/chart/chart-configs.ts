import { ChartSeriesBinding } from './chart-series-binding.model';
import { ChartToleranceBand } from './chart-tolerance-band.model';
import { ChartValueAxis } from './chart-value-axis.model';
import { ChartWidgetConfigBase } from './chart-widget-config-base.model';

/** Reads chart configs, folding in the shapes of charts saved by older versions. */
export class ChartConfigs {
  /** Shared by legacy-folded configs and null axis bindings so both resolve to the same axis. */
  public static readonly PRIMARY_AXIS_ID = 'primary';

  /**
   * Axis columns a tolerance filter can key off: only those targeted by exactly one complete band,
   * mirroring how the server maps bands to axis columns.
   */
  public static bandedColumns(
    bands: readonly ChartToleranceBand[],
    binding: { xColumnId: string | null; yColumnId: string | null },
  ): string[] {
    const complete = bands.filter(ChartConfigs.isCompleteToleranceBand);
    const columns: string[] = [];
    for (const [axis, columnId] of [
      ['x', binding.xColumnId],
      ['y', binding.yColumnId],
    ] as const) {
      if (columnId && complete.filter((b) => b.axis === axis).length === 1) {
        columns.push(columnId);
      }
    }
    return columns;
  }

  /** The `?? []` only guards a config mid-construction. */
  public static bindings(config: ChartWidgetConfigBase): ChartSeriesBinding[] {
    return config.bindings ?? [];
  }

  /** A bar binding's measures, folding a legacy single-measure binding from `yColumnId`. */
  public static barValueColumnIds(binding: ChartSeriesBinding): string[] {
    return ChartConfigs.valueColumnIds(binding, binding.yColumnId);
  }

  /** A histogram binding's columns, folding a legacy single-column binding from `xColumnId`. */
  public static histogramValueColumnIds(binding: ChartSeriesBinding): string[] {
    return ChartConfigs.valueColumnIds(binding, binding.xColumnId);
  }

  /**
   * The chart's value axes. Charts saved before multiple axes existed get a single primary axis
   * built from the deprecated `yAxisLabel`, so there is always at least one.
   */
  public static axes(config: ChartWidgetConfigBase): ChartValueAxis[] {
    if (config.yAxes?.length) {
      return config.yAxes;
    }
    return [{ id: ChartConfigs.PRIMARY_AXIS_ID, label: config.yAxisLabel ?? '', side: 'left' }];
  }

  /** A null or stale `yAxisId` falls back to the primary axis (index 0). */
  public static axisIndex(axes: readonly ChartValueAxis[], yAxisId: string | null): number {
    if (!yAxisId) {
      return 0;
    }
    const index = axes.findIndex((a) => a.id === yAxisId);
    return index < 0 ? 0 : index;
  }

  public static axisDisplayName(axis: ChartValueAxis, index: number): string {
    const label = axis.label.trim();
    if (label) {
      return label;
    }
    return index === 0 ? `Primary (${axis.side})` : `Axis ${index + 1} (${axis.side})`;
  }

  /** A band is only usable once it points at a spec. */
  private static isCompleteToleranceBand(band: ChartToleranceBand): boolean {
    return !!(band.sourceDatasetId && band.sourceRowId && band.minColumnId && band.maxColumnId);
  }

  private static valueColumnIds(
    binding: ChartSeriesBinding,
    legacyColumnId: string | null,
  ): string[] {
    const ids = binding.valueColumnIds?.filter((id): id is string => !!id);
    if (ids?.length) {
      return ids;
    }
    return legacyColumnId ? [legacyColumnId] : [];
  }
}
