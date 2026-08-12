import {
  DEFAULT_SCATTER_CHART_CONFIG,
  ScatterChartWidget,
  ScatterChartWidgetConfig,
} from '../../../core/models/report.model';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './widget-model-base';

/** A scatter chart: X/Y points, one mark per row. Adds no options beyond the shared chart base. */
export class ScatterChartWidgetModel extends ChartWidgetModel {
  override readonly type = 'scatterChart' as const;

  constructor(widget: ScatterChartWidget, sources: ModelSources) {
    super(widget, sources);
  }

  override toDto(): ScatterChartWidget {
    const config: ScatterChartWidgetConfig = {
      type: 'scatterChart',
      ...DEFAULT_SCATTER_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
    };
    return { ...this.geometryDto(), type: 'scatterChart', config };
  }

  protected override defaultTitle(): string {
    return widgetTypeDescriptor('scatterChart').label;
  }
}
