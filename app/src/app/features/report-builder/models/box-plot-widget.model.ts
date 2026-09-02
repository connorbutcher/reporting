import { signal } from '@angular/core';
import {
  BoxPlotWidget,
  BoxPlotWidgetConfig,
  BoxSort,
  BoxWhisker,
  DEFAULT_BOX_PLOT_CONFIG,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ValidationIssue } from './validation-issue';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './widget-model-base';

/**
 * A box-and-whisker chart. It reuses the shared chart base for dataset/series/filter binding,
 * reading `xColumnId` as the category the boxes group by and `yColumnId` as the measure whose
 * spread each box summarises — both required, unlike a bar chart's count aggregate.
 */
export class BoxPlotWidgetModel extends ChartWidgetModel {
  public override readonly type = 'boxPlot' as const;

  /** Where the whiskers end, and whether outliers are drawn beyond them. */
  public readonly whisker = signal<BoxWhisker>('tukey');
  /** The whisker length multiplier — of the IQR for `tukey`, of the standard deviation for `stdDev`. */
  public readonly whiskerFactor = signal(1.5);
  /** How the categories are ordered along the axis. */
  public readonly sort = signal<BoxSort>('category');
  /** Draws the mean as a marker inside each box, alongside the median line. */
  public readonly showMean = signal(false);
  /** Prints each box's sample size (n) above it. */
  public readonly showSampleSize = signal(false);
  /** Overlays the individual measurements as jittered points over each box. */
  public readonly showPoints = signal(false);
  /** Adds process capability (Cp/Cpk) to each box's tooltip, resolved against the value-axis spec band. */
  public readonly showCapability = signal(false);
  /** Draws boxes horizontally (categories down the Y axis) rather than upright. */
  public readonly horizontal = signal(false);

  constructor(widget: BoxPlotWidget, sources: ModelSources) {
    super(widget, sources);
    this.whisker.set(widget.config.whisker);
    // Charts saved before these existed default to the box-plot config defaults.
    this.whiskerFactor.set(widget.config.whiskerFactor ?? 1.5);
    this.sort.set(widget.config.sort ?? 'category');
    this.showMean.set(widget.config.showMean ?? false);
    this.showSampleSize.set(widget.config.showSampleSize ?? false);
    this.showPoints.set(widget.config.showPoints ?? false);
    this.showCapability.set(widget.config.showCapability ?? false);
    this.horizontal.set(widget.config.horizontal);
  }

  public override toDto(): BoxPlotWidget {
    const config: BoxPlotWidgetConfig = {
      type: 'boxPlot',
      ...DEFAULT_BOX_PLOT_CONFIG,
      ...this.chartConfigBaseDto(),
      whisker: this.whisker(),
      whiskerFactor: this.whiskerFactor(),
      sort: this.sort(),
      showMean: this.showMean(),
      showSampleSize: this.showSampleSize(),
      showPoints: this.showPoints(),
      showCapability: this.showCapability(),
      horizontal: this.horizontal(),
    };
    return { ...this.geometryDto(), type: 'boxPlot', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('boxPlot').label;
  }

  // Category maps to xColumnId, measure to yColumnId; both are required, so the worded
  // messages differ from the shared "X and Y" check point charts use.
  public override ownIssues(): ValidationIssue[] {
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
          detail: 'Pick a category column to group the boxes by.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    if (!this.yColumnId()) {
      return [
        {
          id: `${this.id}:noValue`,
          severity: 'warning',
          title: `${name} has no value`,
          detail: 'Pick a value column whose spread each box summarises.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    return [];
  }
}
