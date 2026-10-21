import { signal } from '@angular/core';
import {
  DEFAULT_LINE_CHART_CONFIG,
  LineChartWidget,
  LineChartWidgetConfig,
  Aggregate,
  DateGrouping,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './sources/model-sources';

export class LineChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'lineChart' as const;

  public readonly smooth = signal(false);
  public readonly showPoints = signal(true);
  public readonly areaFill = signal(false);
  /** Reduces rows sharing an X value to one point; null plots raw rows. */
  public readonly aggregate = signal<Aggregate | null>(null);
  /** Buckets a date X axis by period before aggregating. */
  public readonly xGrouping = signal<DateGrouping | null>(null);

  constructor(widget: LineChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.smooth.set(widget.config.smooth);
    this.showPoints.set(widget.config.showPoints);
    this.areaFill.set(widget.config.areaFill);
    this.aggregate.set(widget.config.aggregate ?? null);
    this.xGrouping.set(widget.config.xGrouping ?? null);
  }

  public override toDto(): LineChartWidget {
    const config: LineChartWidgetConfig = {
      type: 'lineChart',
      ...DEFAULT_LINE_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
      smooth: this.smooth(),
      showPoints: this.showPoints(),
      areaFill: this.areaFill(),
      aggregate: this.aggregate(),
      xGrouping: this.xGrouping(),
    };
    return { ...this.geometryDto(), type: 'lineChart', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('lineChart').label;
  }
}
