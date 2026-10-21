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

// Registers only what the widget renders, to keep the bundle small. A new series or component
// must be registered here too, or echarts silently drops it.
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
