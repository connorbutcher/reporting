import { signal } from '@angular/core';
import {
  ChartSort,
  DEFAULT_CHART_SORT,
  DEFAULT_XBAR_R_CHART_CONFIG,
  XBarRChartWidget,
  XBarRChartWidgetConfig,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ValidationIssue } from './validation-issue';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './widget-model-base';

/**
 * An Xbar-R control chart. It reuses the shared chart base for dataset/axis/filter binding,
 * reading `xColumnId` as the subgroup each row belongs to and `yColumnId` as the measure whose
 * mean and range each subgroup plots — both required, like a box plot's category and value.
 */
export class XBarRChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'xbarRChart' as const;

  /** How the subgroups are ordered along the shared axis. */
  public readonly sort = signal<ChartSort>(DEFAULT_CHART_SORT);
  /** Colours a subgroup's mean or range red when it falls outside its control limits. */
  public readonly highlightOutOfControl = signal(true);

  constructor(widget: XBarRChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.sort.set(widget.config.sort ?? DEFAULT_CHART_SORT);
    this.highlightOutOfControl.set(widget.config.highlightOutOfControl ?? true);
  }

  public override toDto(): XBarRChartWidget {
    const config: XBarRChartWidgetConfig = {
      type: 'xbarRChart',
      ...DEFAULT_XBAR_R_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
      sort: this.sort(),
      highlightOutOfControl: this.highlightOutOfControl(),
    };
    return { ...this.geometryDto(), type: 'xbarRChart', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('xbarRChart').label;
  }

  // Subgroup maps to xColumnId, measure to yColumnId; both are required, so the worded
  // messages differ from the shared "X and Y" check point charts use.
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
