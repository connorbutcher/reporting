import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ChartWidgetModel } from '../../../models/widget.model';
import { ChartTypePanelDirective, ChartTypePanels } from '../../chart-type-panel.directive';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelBarChartAppearanceComponent } from '../panel-bar-chart-appearance/panel-bar-chart-appearance.component';
import { PanelBoxPlotAppearanceComponent } from '../panel-box-plot-appearance/panel-box-plot-appearance.component';
import { PanelHistogramAppearanceComponent } from '../panel-histogram-appearance/panel-histogram-appearance.component';
import { PanelPointChartAppearanceComponent } from '../panel-point-chart-appearance/panel-point-chart-appearance.component';

/**
 * The "Appearance" group of the chart detail panel: the legend and gridline toggles that
 * every chart shares, then the type-specific options created in place for the current
 * chart kind.
 */
@Component({
  selector: 'app-panel-chart-appearance',
  imports: [FormsModule, CheckboxModule, PanelGroupComponent, ChartTypePanelDirective],
  templateUrl: './panel-chart-appearance.component.html',
})
export class PanelChartAppearanceComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  public readonly panels: ChartTypePanels = {
    scatterChart: PanelPointChartAppearanceComponent,
    lineChart: PanelPointChartAppearanceComponent,
    barChart: PanelBarChartAppearanceComponent,
    boxPlot: PanelBoxPlotAppearanceComponent,
    histogram: PanelHistogramAppearanceComponent,
  };
}
