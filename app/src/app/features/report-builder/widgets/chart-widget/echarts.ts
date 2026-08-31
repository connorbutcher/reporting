import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Only the pieces the chart widget actually renders, so the bundle carries a
// fraction of the full echarts build:
//   - charts: scatter, line, bar (the three widget kinds)
//   - grid + axis pointer: the plot area and the bar tooltip's shadow pointer
//   - tooltip / legend: hover detail and the multi-series legend
//   - markLine / markArea: tolerance reference lines and shaded spec zones
//   - dataZoom: inside-drag + slider zoom/pan
//   - canvas renderer: the draw backend
// Adding a new option feature (e.g. visualMap, toolbox) means registering its
// component here too, or echarts silently drops it at runtime.
echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  AxisPointerComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export default echarts;
