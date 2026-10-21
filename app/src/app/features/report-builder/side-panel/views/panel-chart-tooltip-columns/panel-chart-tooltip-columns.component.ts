import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ChartWidgetModel } from '../../../models/widget.model';
import { PanelGroupComponent } from '../../panel-group.component';

/** The chart's "Tooltip" group: extra columns shown on hover. */
@Component({
  selector: 'app-panel-chart-tooltip-columns',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-chart-tooltip-columns.component.html',
  styleUrl: './panel-chart-tooltip-columns.component.scss',
})
export class PanelChartTooltipColumnsComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** Grouping charts summarise tooltip columns per mark rather than per row. */
  public readonly grouped = input(false);

  public tooltipColumnsExhausted(): boolean {
    const total = this.chart().schema()?.columns.length ?? 0;
    return total > 0 && this.chart().tooltipColumns().length >= total;
  }
}
