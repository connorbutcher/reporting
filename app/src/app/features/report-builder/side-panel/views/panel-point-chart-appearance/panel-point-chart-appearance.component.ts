import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { ChartWidgetModel, LineChartWidgetModel } from '../../../models/widget.model';
import { PanelLineChartOptionsComponent } from '../panel-line-chart-options/panel-line-chart-options.component';

/** Appearance options for a point chart (scatter/line): mark size, labels, colouring, and zoom. */
@Component({
  selector: 'app-panel-point-chart-appearance',
  imports: [FormsModule, CheckboxModule, InputNumberModule, PanelLineChartOptionsComponent],
  templateUrl: './panel-point-chart-appearance.component.html',
})
export class PanelPointChartAppearanceComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** The model narrowed to a line chart, so the line-only options render only for it. */
  public readonly lineChart = computed(() => {
    const chart = this.chart();
    return chart instanceof LineChartWidgetModel ? chart : null;
  });
}
