import type { BarSeriesOption, LineSeriesOption, ScatterSeriesOption } from 'echarts/charts';

/** The two point-chart series kinds; a bar chart uses {@link BarSeriesOption}. */
export type PointSeriesOption = LineSeriesOption | ScatterSeriesOption;
