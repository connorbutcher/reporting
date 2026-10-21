import { Component, input } from '@angular/core';
import { XBarRChartWidgetModel } from '../../../models/widget.model';
import { PanelXBarROptionsComponent } from '../panel-xbar-r-options/panel-xbar-r-options.component';

@Component({
  selector: 'app-panel-xbar-r-appearance',
  imports: [PanelXBarROptionsComponent],
  template: `<app-panel-xbar-r-options [chart]="chart()" />`,
})
export class PanelXBarRAppearanceComponent {
  public readonly chart = input.required<XBarRChartWidgetModel>();
}
