import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { BoxWhisker } from '../../../../../core/models/report';
import { BoxPlotWidgetModel } from '../../../models/widget.model';
import { PanelChartSortComponent } from '../panel-chart-sort/panel-chart-sort.component';

/** The box-plot-only options: whiskers, ordering, the engineering overlays, and orientation. */
@Component({
  selector: 'app-panel-box-plot-options',
  imports: [FormsModule, CheckboxModule, InputNumberModule, SelectModule, PanelChartSortComponent],
  templateUrl: './panel-box-plot-options.component.html',
})
export class PanelBoxPlotOptionsComponent {
  public readonly chart = input.required<BoxPlotWidgetModel>();

  /** The whisker options offered, in menu order. */
  public readonly whiskers: { label: string; value: BoxWhisker }[] = [
    { label: 'Tukey (× IQR) + outliers', value: 'tukey' },
    { label: 'Std dev (× σ from mean) + outliers', value: 'stdDev' },
    { label: 'Min / max', value: 'minMax' },
  ];

  /** The whisker length multiplier only applies to the fence-based modes, not min/max. */
  public readonly showFactor = computed(() => this.chart().whisker() !== 'minMax');

  /** The unit the multiplier is measured in, for the field's suffix. */
  public readonly factorUnit = computed(() =>
    this.chart().whisker() === 'stdDev' ? '× σ' : '× IQR',
  );
}
