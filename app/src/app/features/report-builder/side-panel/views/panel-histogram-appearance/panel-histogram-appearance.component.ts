import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { HistogramWidgetModel } from '../../../models/widget.model';
import { PanelHistogramOptionsComponent } from '../panel-histogram-options/panel-histogram-options.component';

/** Appearance options for a histogram: value labels, plus the histogram-only binning options. */
@Component({
  selector: 'app-panel-histogram-appearance',
  imports: [FormsModule, CheckboxModule, PanelHistogramOptionsComponent],
  templateUrl: './panel-histogram-appearance.component.html',
})
export class PanelHistogramAppearanceComponent {
  public readonly chart = input.required<HistogramWidgetModel>();
}
