import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ComboChartWidgetModel } from '../../../models/widget.model';
import { PanelChartSortComponent } from '../panel-chart-sort/panel-chart-sort.component';

/**
 * Appearance options for a combination chart: value labels, how the bars/lines are ordered, and
 * bar stacking (as on a bar chart), plus the line-only smooth/points/area options, shown once any
 * series is drawn as a line.
 */
@Component({
  selector: 'app-panel-combo-chart-appearance',
  imports: [FormsModule, CheckboxModule, PanelChartSortComponent],
  templateUrl: './panel-combo-chart-appearance.component.html',
})
export class PanelComboChartAppearanceComponent {
  public readonly chart = input.required<ComboChartWidgetModel>();
}
