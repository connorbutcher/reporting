import { Component, input } from '@angular/core';
import { BoxPlotWidgetModel } from '../../../models/widget.model';
import { PanelBoxPlotOptionsComponent } from '../panel-box-plot-options/panel-box-plot-options.component';

@Component({
  selector: 'app-panel-box-plot-appearance',
  imports: [PanelBoxPlotOptionsComponent],
  template: `<app-panel-box-plot-options [chart]="chart()" />`,
})
export class PanelBoxPlotAppearanceComponent {
  public readonly chart = input.required<BoxPlotWidgetModel>();
}
