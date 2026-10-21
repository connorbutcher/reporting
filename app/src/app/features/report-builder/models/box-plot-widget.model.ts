import { signal } from '@angular/core';
import {
  BoxPlotWidget,
  BoxPlotWidgetConfig,
  BoxWhisker,
  ChartSort,
  DEFAULT_BOX_PLOT_CONFIG,
  DEFAULT_CHART_SORT,
  DateGrouping,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ValidationIssue } from './validation-issue';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './sources/model-sources';

/** A box plot: `xColumnId` is the category and `yColumnId` the measure; both are required. */
export class BoxPlotWidgetModel extends ChartWidgetModel {
  public override readonly type = 'boxPlot' as const;

  /** Where whiskers end, and whether outliers are drawn beyond them. */
  public readonly whisker = signal<BoxWhisker>('tukey');
  /** Multiplies the IQR for `tukey`, the standard deviation for `stdDev`. */
  public readonly whiskerFactor = signal(1.5);
  public readonly sort = signal<ChartSort>(DEFAULT_CHART_SORT);
  public readonly showMean = signal(false);
  public readonly showSampleSize = signal(false);
  public readonly showPoints = signal(false);
  /** Adds Pp/Ppk to each box's tooltip, against the value-axis spec band. */
  public readonly showCapability = signal(false);
  public readonly horizontal = signal(false);
  /** Buckets a date category by period; null groups by exact date. */
  public readonly categoryGrouping = signal<DateGrouping | null>(null);

  constructor(widget: BoxPlotWidget, sources: ModelSources) {
    super(widget, sources);
    this.whisker.set(widget.config.whisker);
    // Older charts default to the box-plot defaults.
    this.whiskerFactor.set(widget.config.whiskerFactor ?? 1.5);
    this.sort.set(widget.config.sort ?? DEFAULT_CHART_SORT);
    this.showMean.set(widget.config.showMean ?? false);
    this.showSampleSize.set(widget.config.showSampleSize ?? false);
    this.showPoints.set(widget.config.showPoints ?? false);
    this.showCapability.set(widget.config.showCapability ?? false);
    this.horizontal.set(widget.config.horizontal);
    this.categoryGrouping.set(widget.config.categoryGrouping ?? null);
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
      categoryGrouping: this.categoryGrouping(),
    };
    return { ...this.geometryDto(), type: 'boxPlot', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('boxPlot').label;
  }

  public override ownIssues(): ValidationIssue[] {
    const name = this.label();
    const shared = this.sharedChartIssues();

    if (!this.datasetId()) {
      return [
        ...shared,
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
        ...shared,
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
        ...shared,
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

    return shared;
  }
}
