import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { BarChartWidgetModel } from '../../../models/widget.model';

/** The bar-only appearance options (stacked, horizontal). */
@Component({
  selector: 'app-panel-bar-chart-options',
  imports: [FormsModule, CheckboxModule],
  templateUrl: './panel-bar-chart-options.component.html',
})
export class PanelBarChartOptionsComponent {
  public readonly chart = input.required<BarChartWidgetModel>();
}
