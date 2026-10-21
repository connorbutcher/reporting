import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { HistogramBinMode, HistogramNormalize } from '../../../../../core/models/report';
import { HistogramWidgetModel } from '../../../models/widget.model';

@Component({
  selector: 'app-panel-histogram-options',
  imports: [FormsModule, CheckboxModule, InputNumberModule, SelectModule],
  templateUrl: './panel-histogram-options.component.html',
})
export class PanelHistogramOptionsComponent {
  public readonly chart = input.required<HistogramWidgetModel>();

  public readonly binModes: { label: string; value: HistogramBinMode }[] = [
    { label: 'Automatic', value: 'auto' },
    { label: 'Number of bins', value: 'count' },
    { label: 'Bin width', value: 'width' },
  ];

  public readonly normalizations: { label: string; value: HistogramNormalize }[] = [
    { label: 'Count', value: 'count' },
    { label: 'Frequency (relative)', value: 'frequency' },
    { label: 'Density', value: 'density' },
  ];

  public readonly showBinCount = computed(() => this.chart().binMode() === 'count');
  public readonly showBinWidth = computed(() => this.chart().binMode() === 'width');
}
