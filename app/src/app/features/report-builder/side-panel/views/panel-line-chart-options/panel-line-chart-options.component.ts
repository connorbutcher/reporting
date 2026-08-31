import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { LineChartWidgetModel } from '../../../models/widget.model';

/** The line-only appearance options (smooth, show points, area fill). */
@Component({
  selector: 'app-panel-line-chart-options',
  imports: [FormsModule, CheckboxModule],
  templateUrl: './panel-line-chart-options.component.html',
})
export class PanelLineChartOptionsComponent {
  public readonly chart = input.required<LineChartWidgetModel>();
}
