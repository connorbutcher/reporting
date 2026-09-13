import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ComboChartWidgetModel } from '../../../models/widget.model';

/**
 * Appearance options for a combination chart: value labels and bar stacking (as on a bar chart),
 * plus the line-only smooth/points/area options, shown once any series is drawn as a line.
 */
@Component({
  selector: 'app-panel-combo-chart-appearance',
  imports: [FormsModule, CheckboxModule],
  templateUrl: './panel-combo-chart-appearance.component.html',
})
export class PanelComboChartAppearanceComponent {
  public readonly chart = input.required<ComboChartWidgetModel>();
}
