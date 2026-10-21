import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { ChartWidgetModel, LineChartWidgetModel } from '../../../models/widget.model';
import { PanelLineChartOptionsComponent } from '../panel-line-chart-options/panel-line-chart-options.component';

@Component({
  selector: 'app-panel-point-chart-appearance',
  imports: [FormsModule, CheckboxModule, InputNumberModule, PanelLineChartOptionsComponent],
  templateUrl: './panel-point-chart-appearance.component.html',
})
export class PanelPointChartAppearanceComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  public readonly lineChart = computed(() => {
    const chart = this.chart();
    return chart instanceof LineChartWidgetModel ? chart : null;
  });
}
