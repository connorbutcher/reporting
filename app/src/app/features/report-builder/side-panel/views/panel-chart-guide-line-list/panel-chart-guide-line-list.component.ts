import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartGuideLine } from '../../../../../core/models/report';
import { ChartWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

@Component({
  selector: 'app-panel-chart-guide-line-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-guide-line-list.component.html',
})
export class PanelChartGuideLineListComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  private readonly navigation = inject(PanelNavigation);

  /** Adds a line and opens it. */
  public addGuideLine(): void {
    const chart = this.chart();
    const lineId = chart.addGuideLine();
    this.navigation.navigate({ kind: 'chartGuideLine', widgetId: chart.id, lineId });
  }

  public lineSummary(line: ChartGuideLine): string {
    const label = line.label.trim();
    const range = line.valueTo !== null && line.valueTo !== undefined;
    const position = range ? `${line.value}–${line.valueTo}` : String(line.value);
    return label ? `${label} (${position})` : position;
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
