import * as echarts from 'echarts/core';
import {
  BarChart,
  BoxplotChart,
  EffectScatterChart,
  LineChart,
  ScatterChart,
} from 'echarts/charts';
import {
  AriaComponent,
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Only the pieces the chart widget actually renders, so the bundle carries a
// fraction of the full echarts build:
//   - charts: scatter, line, bar, boxplot (the widget kinds; boxplot reuses scatter for outliers),
//     effectScatter (the ripple that draws the eye to a comment's highlighted anchor point)
//   - grid + axis pointer: the plot area and the bar tooltip's shadow pointer
//   - tooltip / legend: hover detail and the multi-series legend
//   - markLine / markArea: tolerance reference lines and shaded spec zones
//   - dataZoom: inside-drag + slider zoom/pan
//   - visualMap: the continuous colour-by-value scale
//   - aria + title: the screen-reader description of each chart (the title is never drawn; it
//     only names the chart in that description)
//   - canvas renderer: the draw backend
// Adding a new option feature (e.g. visualMap, toolbox) means registering its
// component here too, or echarts silently drops it at runtime.
echarts.use([
  BarChart,
  BoxplotChart,
  EffectScatterChart,
  LineChart,
  ScatterChart,
  GridComponent,
  AxisPointerComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  VisualMapComponent,
  AriaComponent,
  TitleComponent,
  CanvasRenderer,
]);

export default echarts;
