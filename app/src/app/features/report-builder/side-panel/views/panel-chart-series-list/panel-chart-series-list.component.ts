import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartBindingModel, ChartWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * The "Data series" group of the chart detail panel: a scannable row per dataset
 * overlaid on the chart, each drilling into its own {@link PanelChartSeriesComponent}
 * screen, plus a button to add another. Keeps the detail panel from becoming a
 * stack of long per-series cards.
 */
@Component({
  selector: 'app-panel-chart-series-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-series-list.component.html',
})
export class PanelChartSeriesListComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  /** Adds a series and jumps straight into it, rather than leaving the user to find it in the list. */
  public addSeries(): void {
    const chart = this.chart();
    const bindingId = chart.addBinding();
    this.navigation.navigate({ kind: 'chartSeries', widgetId: chart.id, bindingId });
  }

  /** The dataset name for a series, or a prompt when it isn't bound yet. */
  public seriesLabel(binding: ChartBindingModel): string {
    const id = binding.datasetId();
    if (!id) return 'New series';
    return this.session.datasets().find((d) => d.id === id)?.name ?? 'Dataset';
  }

  /** A one-line summary of the series' axes, or what's left to set up. */
  public seriesHint(binding: ChartBindingModel): string {
    if (!binding.datasetId()) return 'Pick a dataset';
    const columns = binding.schema()?.columns ?? [];
    const nameOf = (id: string | null) => columns.find((c) => c.id === id)?.name;
    const x = nameOf(binding.xColumnId());
    const y = nameOf(binding.yColumnId());
    if (!x || !y) return 'Choose X and Y columns';
    return `${x} → ${y}`;
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
