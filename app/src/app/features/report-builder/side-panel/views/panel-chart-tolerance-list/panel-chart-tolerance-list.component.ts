import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartToleranceBand } from '../../../../../core/models/report';
import { ChartWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The "Tolerance bands" group of the chart detail panel: lists each band and adds new ones. */
@Component({
  selector: 'app-panel-chart-tolerance-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-tolerance-list.component.html',
})
export class PanelChartToleranceListComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  /** Adds a band and jumps straight to it, rather than leaving the user to find it in the list. */
  public addToleranceBand(): void {
    const chart = this.chart();
    const bandId = chart.addToleranceBand();
    this.navigation.navigate({ kind: 'chartToleranceBand', widgetId: chart.id, bandId });
  }

  public bandSummary(band: ChartToleranceBand): string {
    if (!band.sourceDatasetId) return 'Not set up yet';
    return this.session.datasets().find((d) => d.id === band.sourceDatasetId)?.name ?? 'Dataset';
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
