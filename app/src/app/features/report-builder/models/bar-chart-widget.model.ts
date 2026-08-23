import { signal } from '@angular/core';
import {
  Aggregate,
  BarChartWidget,
  BarChartWidgetConfig,
  DEFAULT_BAR_CHART_CONFIG,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ValidationIssue } from './validation-issue';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './widget-model-base';

/**
 * A bar chart. It reuses the shared chart base for dataset/series/filter binding,
 * reading `xColumnId` as the category and `yColumnId` as the measure the aggregate
 * reduces. Count needs no measure, so validation only insists on one for the other
 * aggregates.
 */
export class BarChartWidgetModel extends ChartWidgetModel {
  override readonly type = 'barChart' as const;

  readonly aggregate = signal<Aggregate>('sum');
  /** Stacks a category's series bars into one column instead of placing them side by side. */
  readonly stacked = signal(false);
  /** Draws bars horizontally (categories down the Y axis) rather than as vertical columns. */
  readonly horizontal = signal(false);

  constructor(widget: BarChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.aggregate.set(widget.config.aggregate);
    this.stacked.set(widget.config.stacked);
    this.horizontal.set(widget.config.horizontal);
  }

  /** Count summarises row counts, so it needs no measure column. */
  needsValue(): boolean {
    return this.aggregate() !== 'count';
  }

  override toDto(): BarChartWidget {
    const config: BarChartWidgetConfig = {
      type: 'barChart',
      ...DEFAULT_BAR_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
      aggregate: this.aggregate(),
      stacked: this.stacked(),
      horizontal: this.horizontal(),
    };
    return { ...this.geometryDto(), type: 'barChart', config };
  }

  protected override defaultTitle(): string {
    return widgetTypeDescriptor('barChart').label;
  }

  // Category maps to xColumnId, measure to yColumnId; the measure is optional for
  // Count, so the shared "needs both axes" check doesn't fit.
  protected override ownIssues(): ValidationIssue[] {
    const name = this.label();

    if (!this.datasetId()) {
      return [
        {
          id: `${this.id}:noDataset`,
          severity: 'warning',
          title: `${name} has no dataset`,
          detail: 'Pick a dataset so the chart has something to plot.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    if (!this.xColumnId()) {
      return [
        {
          id: `${this.id}:noCategory`,
          severity: 'warning',
          title: `${name} has no category`,
          detail: 'Pick a category column to group the bars by.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    if (this.needsValue() && !this.yColumnId()) {
      return [
        {
          id: `${this.id}:noValue`,
          severity: 'warning',
          title: `${name} has no value`,
          detail: `Pick a value column for the ${this.aggregate()} to summarise.`,
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    return [];
  }
}
