import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { BarChartWidgetModel } from '../../../models/widget.model';
import { PanelBarChartOptionsComponent } from '../panel-bar-chart-options/panel-bar-chart-options.component';
import { PanelChartSortComponent } from '../panel-chart-sort/panel-chart-sort.component';

@Component({
  selector: 'app-panel-bar-chart-appearance',
  imports: [FormsModule, CheckboxModule, PanelBarChartOptionsComponent, PanelChartSortComponent],
  templateUrl: './panel-bar-chart-appearance.component.html',
})
export class PanelBarChartAppearanceComponent {
  public readonly chart = input.required<BarChartWidgetModel>();
}
