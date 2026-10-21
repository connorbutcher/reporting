import {
  DEFAULT_SCATTER_CHART_CONFIG,
  ScatterChartWidget,
  ScatterChartWidgetConfig,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './sources/model-sources';

/** A scatter chart: one point per row. */
export class ScatterChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'scatterChart' as const;

  constructor(widget: ScatterChartWidget, sources: ModelSources) {
    super(widget, sources);
  }

  public override toDto(): ScatterChartWidget {
    const config: ScatterChartWidgetConfig = {
      type: 'scatterChart',
      ...DEFAULT_SCATTER_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
    };
    return { ...this.geometryDto(), type: 'scatterChart', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('scatterChart').label;
  }
}
