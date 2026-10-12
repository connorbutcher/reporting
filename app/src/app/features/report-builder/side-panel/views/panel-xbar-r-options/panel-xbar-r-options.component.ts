import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { XBarRChartWidgetModel } from '../../../models/widget.model';
import { PanelChartSortComponent } from '../panel-chart-sort/panel-chart-sort.component';

/** The Xbar-R-only options: subgroup ordering and the out-of-control highlight. */
@Component({
  selector: 'app-panel-xbar-r-options',
  imports: [FormsModule, CheckboxModule, PanelChartSortComponent],
  templateUrl: './panel-xbar-r-options.component.html',
})
export class PanelXBarROptionsComponent {
  public readonly chart = input.required<XBarRChartWidgetModel>();
}
