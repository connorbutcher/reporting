import { signal } from '@angular/core';
import {
  DEFAULT_LINE_CHART_CONFIG,
  LineChartWidget,
  LineChartWidgetConfig,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './widget-model-base';

/** A line chart, with its own line-specific presentation options on top of the shared chart base. */
export class LineChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'lineChart' as const;

  /** Draws the line with curved rather than straight segments. */
  public readonly smooth = signal(false);
  /** Whether point markers are drawn along the line. */
  public readonly showPoints = signal(true);
  /** Shades the area under the line. */
  public readonly areaFill = signal(false);

  constructor(widget: LineChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.smooth.set(widget.config.smooth);
    this.showPoints.set(widget.config.showPoints);
    this.areaFill.set(widget.config.areaFill);
  }

  public override toDto(): LineChartWidget {
    const config: LineChartWidgetConfig = {
      type: 'lineChart',
      ...DEFAULT_LINE_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
      smooth: this.smooth(),
      showPoints: this.showPoints(),
      areaFill: this.areaFill(),
    };
    return { ...this.geometryDto(), type: 'lineChart', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('lineChart').label;
  }
}
