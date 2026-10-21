import type { LineSeriesOption } from 'echarts/charts';
import { ChartSeriesResult, TrendLine } from '../../../../../../../core/models/widget-query';

/** A series' dashed trend line, with its slope and R² shown at the line's end. */
export class TrendLineSeries {
  private static readonly DAY = 86_400_000;
  /** About px per character of the trend label's 11px font, erring wide. */
  private static readonly CHAR_WIDTH = 6.5;
  /** The trend label's own distance from its point. */
  private static readonly LABEL_DISTANCE = 6;
  private static readonly LABEL_MARGIN = 10;

  /** Shares `mainName` so it toggles with its series. Null when the series has no fit. */
  public static series(
    series: ChartSeriesResult,
    mainName: string,
    color: string,
    yAxisIndex: number | null,
    xIsDate = false,
  ): LineSeriesOption | null {
    const trend = series.trendLine;
    if (!trend) return null;
    const stats = TrendLineSeries.statsText(trend, xIsDate);
    return {
      type: 'line',
      name: mainName,
      data: [
        [trend.x1, trend.y1],
        [trend.x2, trend.y2],
      ],
      showSymbol: false,
      symbol: 'none',
      legendHoverLink: false,
      lineStyle: { type: 'dashed', color, width: 1.5 },
      endLabel: { show: true, formatter: () => stats, color, fontSize: 11, distance: 6 },
      tooltip: { formatter: () => stats },
      ...(yAxisIndex !== null ? { yAxisIndex } : {}),
    };
  }

  /**
   * On a date X the slope is rescaled from epoch millis to per day (or per month over long spans),
   * to three significant figures.
   */
  public static statsText(trend: TrendLine, xIsDate = false): string {
    const { slope, unit } = xIsDate
      ? TrendLineSeries.dateSlope(trend)
      : { slope: trend.slope, unit: '' };
    return `Slope: ${TrendLineSeries.significant(slope)}${unit} · R²: ${trend.rSquared.toFixed(2)}`;
  }

  /**
   * The right-edge width to reserve so the stats text isn't clipped; echarts lays the label out
   * after fixing the grid, so it can't size this itself.
   */
  public static labelReserve(series: readonly ChartSeriesResult[], xIsDate = false): number {
    const lengths = series
      .filter((s) => s.trendLine)
      .map((s) => TrendLineSeries.statsText(s.trendLine!, xIsDate).length);
    const maxLen = Math.max(0, ...lengths);
    if (maxLen === 0) return 0;
    return Math.round(
      maxLen * TrendLineSeries.CHAR_WIDTH +
        TrendLineSeries.LABEL_DISTANCE +
        TrendLineSeries.LABEL_MARGIN,
    );
  }

  private static dateSlope(trend: TrendLine): { slope: number; unit: string } {
    const day = TrendLineSeries.DAY;
    const perMonth = Math.abs(trend.x2 - trend.x1) > 2 * 365 * day;
    return {
      slope: trend.slope * (perMonth ? 30.4375 * day : day),
      unit: perMonth ? ' / month' : ' / day',
    };
  }

  private static significant(value: number): string {
    if (value === 0 || !Number.isFinite(value)) return '0';
    return Number(value.toPrecision(3)).toLocaleString('en-US', { maximumFractionDigits: 10 });
  }
}
