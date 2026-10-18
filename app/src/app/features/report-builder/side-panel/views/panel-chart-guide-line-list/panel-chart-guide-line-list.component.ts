import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartGuideLine } from '../../../../../core/models/report';
import { ChartWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The "Guide lines" group of the chart detail panel: lists each line and adds new ones. */
@Component({
  selector: 'app-panel-chart-guide-line-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-guide-line-list.component.html',
})
export class PanelChartGuideLineListComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  private readonly navigation = inject(PanelNavigation);

  /** Adds a line and jumps straight to it, rather than leaving the user to find it in the list. */
  public addGuideLine(): void {
    const chart = this.chart();
    const lineId = chart.addGuideLine();
    this.navigation.navigate({ kind: 'chartGuideLine', widgetId: chart.id, lineId });
  }

  public lineSummary(line: ChartGuideLine): string {
    const label = line.label.trim();
    return label || String(line.value);
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
