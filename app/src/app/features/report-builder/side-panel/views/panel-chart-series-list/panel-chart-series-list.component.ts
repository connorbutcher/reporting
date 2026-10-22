import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import {
  BarChartWidgetModel,
  ChartBindingModel,
  ChartWidgetModel,
  ComboChartWidgetModel,
  HistogramWidgetModel,
} from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The chart's "Data series" group: a row per dataset, each opening its own screen, plus "Add". */
@Component({
  selector: 'app-panel-chart-series-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-series-list.component.html',
})
export class PanelChartSeriesListComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  /** Adds a series and opens it. */
  public addSeries(): void {
    const chart = this.chart();
    const bindingId = chart.addBinding();
    this.navigation.navigate({ kind: 'chartSeries', widgetId: chart.id, bindingId });
  }

  /** The dataset name, or a prompt when unbound. */
  public seriesLabel(binding: ChartBindingModel): string {
    const id = binding.datasetId();
    if (!id) {
      return 'New series';
    }
    return this.session.datasets().find((d) => d.id === id)?.name ?? 'Dataset';
  }

  /** A one-line summary of the series' axes, or what's left to set up. */
  public seriesHint(binding: ChartBindingModel): string {
    if (!binding.datasetId()) {
      return 'Pick a dataset';
    }
    const columnNames = new Map<string | null, string>(
      (binding.schema()?.columns ?? []).map((c) => [c.id, c.name]),
    );
    const x = columnNames.get(binding.xColumnId());

    // Bar and combo series group by a category with several measures; point series plot X→Y.
    if (
      this.chart() instanceof BarChartWidgetModel ||
      this.chart() instanceof ComboChartWidgetModel
    ) {
      if (!x) {
        return 'Choose a category';
      }
      const values = binding
        .barValueColumnIds()
        .map((id) => columnNames.get(id))
        .filter((name): name is string => !!name);
      return values.length > 0 ? `${x} → ${values.join(', ')}` : x;
    }

    // A histogram bins one column, optionally split.
    if (this.chart() instanceof HistogramWidgetModel) {
      if (!x) {
        return 'Choose a column';
      }
      const splitBy = columnNames.get(binding.seriesColumnId());
      return splitBy ? `${x} · split by ${splitBy}` : x;
    }

    const y = columnNames.get(binding.yColumnId());
    if (!x || !y) {
      return 'Choose X and Y columns';
    }
    return `${x} → ${y}`;
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
