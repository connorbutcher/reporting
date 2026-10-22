import {
  WidgetConfigDefaults,
  ScatterChartWidget,
  ScatterChartWidgetConfig,
} from '../../../core/models/report';
import { WidgetCatalog } from '../../../core/models/widget-catalog/widget-catalog';
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
      ...WidgetConfigDefaults.SCATTER_CHART,
      ...this.chartConfigBaseDto(),
    };
    return { ...this.geometryDto(), type: 'scatterChart', config };
  }

  public override defaultTitle(): string {
    return WidgetCatalog.descriptor('scatterChart').label;
  }
}
