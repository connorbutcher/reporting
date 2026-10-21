import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ComboChartWidgetModel } from '../../../models/widget.model';
import { PanelChartSortComponent } from '../panel-chart-sort/panel-chart-sort.component';

/** Combination chart appearance; line-only options show once any series draws as a line. */
@Component({
  selector: 'app-panel-combo-chart-appearance',
  imports: [FormsModule, CheckboxModule, PanelChartSortComponent],
  templateUrl: './panel-combo-chart-appearance.component.html',
})
export class PanelComboChartAppearanceComponent {
  public readonly chart = input.required<ComboChartWidgetModel>();
}
