import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { BarChartWidgetModel } from '../../../models/widget.model';
import { PanelBarChartOptionsComponent } from '../panel-bar-chart-options/panel-bar-chart-options.component';

/** Appearance options for a bar chart: value labels, plus the bar-only stacked/horizontal options. */
@Component({
  selector: 'app-panel-bar-chart-appearance',
  imports: [FormsModule, CheckboxModule, PanelBarChartOptionsComponent],
  templateUrl: './panel-bar-chart-appearance.component.html',
})
export class PanelBarChartAppearanceComponent {
  public readonly chart = input.required<BarChartWidgetModel>();
}
