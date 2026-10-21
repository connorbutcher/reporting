import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ControlChartMode } from '../../../../../core/models/report';
import { XBarRChartWidgetModel } from '../../../models/widget.model';
import { PanelChartSortComponent } from '../panel-chart-sort/panel-chart-sort.component';

@Component({
  selector: 'app-panel-xbar-r-options',
  imports: [FormsModule, CheckboxModule, InputNumberModule, SelectModule, PanelChartSortComponent],
  templateUrl: './panel-xbar-r-options.component.html',
})
export class PanelXBarROptionsComponent {
  public readonly chart = input.required<XBarRChartWidgetModel>();

  public readonly modes: { label: string; value: ControlChartMode }[] = [
    { label: 'X̄-R (mean and range)', value: 'xBarR' },
    { label: 'X̄-S (mean and std dev)', value: 'xBarS' },
    { label: 'I-MR (individuals)', value: 'individuals' },
    { label: 'p (proportion defective)', value: 'p' },
    { label: 'np (number defective)', value: 'np' },
  ];
}
