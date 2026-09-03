import { computed, signal } from '@angular/core';
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
  public override readonly type = 'barChart' as const;

  public readonly aggregate = signal<Aggregate>('sum');
  /** Stacks a category's series bars into one column instead of placing them side by side. */
  public readonly stacked = signal(false);
  /** Draws bars horizontally (categories down the Y axis) rather than as vertical columns. */
  public readonly horizontal = signal(false);

  /**
   * Whether the chart can produce more than one series — from several overlaid datasets, a
   * binding's multiple measures, or a colour-by split. Stacking only means something then, so
   * the "Stack series" toggle keys off it.
   */
  public readonly multiSeries = computed(() => {
    const bindings = this.bindings();
    if (bindings.length > 1) return true;
    return bindings.some((b) => !!b.seriesColumnId() || b.barValueColumnIds().length > 1);
  });

  constructor(widget: BarChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.aggregate.set(widget.config.aggregate);
    this.stacked.set(widget.config.stacked);
    this.horizontal.set(widget.config.horizontal);
  }

  /** Count summarises row counts, so it needs no measure column. */
  public needsValue(): boolean {
    return this.aggregate() !== 'count';
  }

  public override toDto(): BarChartWidget {
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

  public override defaultTitle(): string {
    return widgetTypeDescriptor('barChart').label;
  }

  // Category maps to xColumnId, measures to the binding's value columns; the measure is optional
  // for Count. Each series (binding) is validated, so a half-configured overlaid dataset — which
  // ChartQuery.build would silently skip — still raises a warning, one prompt at a time per series.
  public override ownIssues(): ValidationIssue[] {
    const name = this.label();
    const bindings = this.bindings();
    const multi = bindings.length > 1;
    const view = { kind: 'widget', widgetId: this.id } as const;
    const issues: ValidationIssue[] = [];

    bindings.forEach((binding, i) => {
      const where = multi ? `${name} (series ${i + 1})` : name;
      if (!binding.datasetId()) {
        issues.push({
          id: `${this.id}:noDataset:${binding.id}`,
          severity: 'warning',
          title: `${where} has no dataset`,
          detail: 'Pick a dataset so the chart has something to plot.',
          widgetId: this.id,
          view,
        });
      } else if (!binding.xColumnId()) {
        issues.push({
          id: `${this.id}:noCategory:${binding.id}`,
          severity: 'warning',
          title: `${where} has no category`,
          detail: 'Pick a category column to group the bars by.',
          widgetId: this.id,
          view,
        });
      } else if (this.needsValue() && binding.barValueColumnIds().length === 0) {
        issues.push({
          id: `${this.id}:noValue:${binding.id}`,
          severity: 'warning',
          title: `${where} has no value`,
          detail: `Pick a value column for the ${this.aggregate()} to summarise.`,
          widgetId: this.id,
          view,
        });
      }
    });

    return issues;
  }
}
