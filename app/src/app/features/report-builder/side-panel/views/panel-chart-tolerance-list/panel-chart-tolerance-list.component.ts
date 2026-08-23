import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartToleranceBand } from '../../../../../core/models/report';
import { ChartWidgetModel } from '../../../models/widget.model';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The "Tolerance bands" group of the chart detail panel: lists each band and adds new ones. */
@Component({
  selector: 'app-panel-chart-tolerance-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-tolerance-list.component.html',
})
export class PanelChartToleranceListComponent {
  private readonly store = inject(ReportBuilderStore);

  readonly chart = input.required<ChartWidgetModel>();

  /** Adds a band and jumps straight to it, rather than leaving the user to find it in the list. */
  protected addToleranceBand(): void {
    const chart = this.chart();
    const bandId = chart.addToleranceBand();
    this.store.navigate({ kind: 'chartToleranceBand', widgetId: chart.id, bandId });
  }

  protected bandSummary(band: ChartToleranceBand): string {
    if (!band.sourceDatasetId) return 'Not set up yet';
    return this.store.datasets().find((d) => d.id === band.sourceDatasetId)?.name ?? 'Dataset';
  }

  protected navigate(view: PanelView): void {
    this.store.navigate(view);
  }
}
