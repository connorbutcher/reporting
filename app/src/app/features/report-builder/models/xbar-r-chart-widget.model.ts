import { signal } from '@angular/core';
import {
  ChartSort,
  DEFAULT_CHART_SORT,
  DEFAULT_XBAR_R_CHART_CONFIG,
  XBarRChartWidget,
  XBarRChartWidgetConfig,
  ControlChartMode,
  DateGrouping,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ValidationIssue } from './validation-issue';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './sources/model-sources';

/** An Xbar-R control chart: `xColumnId` is the subgroup and `yColumnId` the measure; both are required. */
export class XBarRChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'xbarRChart' as const;

  public readonly sort = signal<ChartSort>(DEFAULT_CHART_SORT);
  /** Colours a subgroup red when it falls outside its control limits. */
  public readonly highlightOutOfControl = signal(true);
  /** Buckets a date subgroup by period; null groups by exact date. */
  public readonly categoryGrouping = signal<DateGrouping | null>(null);
  public readonly mode = signal<ControlChartMode>('xBarR');
  /** Computes the limits from the first N points; null uses every point. */
  public readonly baselineSubgroups = signal<number | null>(null);
  /** Also flags the Nelson run rules. */
  public readonly runRules = signal(false);

  constructor(widget: XBarRChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.sort.set(widget.config.sort ?? DEFAULT_CHART_SORT);
    this.highlightOutOfControl.set(widget.config.highlightOutOfControl ?? true);
    this.categoryGrouping.set(widget.config.categoryGrouping ?? null);
    this.mode.set(widget.config.mode ?? 'xBarR');
    this.baselineSubgroups.set(widget.config.baselineSubgroups ?? null);
    this.runRules.set(widget.config.runRules ?? false);
  }

  public override toDto(): XBarRChartWidget {
    const config: XBarRChartWidgetConfig = {
      type: 'xbarRChart',
      ...DEFAULT_XBAR_R_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
      sort: this.sort(),
      highlightOutOfControl: this.highlightOutOfControl(),
      categoryGrouping: this.categoryGrouping(),
      mode: this.mode(),
      baselineSubgroups: this.baselineSubgroups(),
      runRules: this.runRules(),
    };
    return { ...this.geometryDto(), type: 'xbarRChart', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('xbarRChart').label;
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
          title: `${name} has no subgroup`,
          detail: 'Pick the column that identifies each subgroup/sample.',
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
          detail: 'Pick the measurement column each subgroup’s mean and range summarise.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    return shared;
  }
}
