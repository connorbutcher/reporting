import { DatasetColumn, NumericColumnConfig } from '../../../../../../../core/models/dataset';
import { Aggregate } from '../../../../../../../core/models/report';
import { BarSeriesResult } from '../../../../../../../core/models/widget-query';
import { ChartColumns } from '../../format/chart-columns';
import { ChartFormat } from '../../format/chart-format';

/** How bar values read: through their own measure's format, or as a percentage. */
export class BarValueFormats {
  public static forSeries(
    s: BarSeriesResult,
    columns: DatasetColumn[],
  ): NumericColumnConfig | undefined {
    return ChartFormat.numericConfig(ChartColumns.byId(columns, s.valueColumnId ?? null));
  }

  /** Each series reads through its own measure's format, else the shared one. A count has none. */
  public static bySeries(
    aggregate: Aggregate,
    series: readonly BarSeriesResult[],
    columns: DatasetColumn[],
    sharedConfig: NumericColumnConfig | undefined,
  ): Map<BarSeriesResult, NumericColumnConfig | undefined> {
    const isCount = aggregate === 'count';
    return new Map(
      series.map((s) => [
        s,
        isCount ? undefined : (BarValueFormats.forSeries(s, columns) ?? sharedConfig),
      ]),
    );
  }

  public static format(
    value: number,
    percent: boolean,
    config: NumericColumnConfig | undefined,
  ): string {
    return percent
      ? `${ChartFormat.numeric(value, { kind: 'numeric', decimals: 1 })}%`
      : ChartFormat.numeric(value, config);
  }
}
