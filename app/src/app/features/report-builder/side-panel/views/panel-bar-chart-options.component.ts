import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { BarChartWidgetModel } from '../../models/widget.model';

/** The bar-only appearance options (stacked, horizontal). */
@Component({
  selector: 'app-panel-bar-chart-options',
  imports: [FormsModule, CheckboxModule],
  template: `
    <div class="panel-inline-field">
      <p-checkbox
        [binary]="true"
        inputId="chart-horizontal"
        [ngModel]="chart().horizontal()"
        (onChange)="chart().horizontal.set($event.checked)"
      />
      <label for="chart-horizontal">Horizontal bars</label>
    </div>
    <div class="panel-inline-field">
      <p-checkbox
        [binary]="true"
        inputId="chart-stacked"
        [ngModel]="chart().stacked()"
        [disabled]="!chart().seriesColumnId()"
        (onChange)="chart().stacked.set($event.checked)"
      />
      <label for="chart-stacked">Stack series</label>
    </div>
  `,
})
export class PanelBarChartOptionsComponent {
  readonly chart = input.required<BarChartWidgetModel>();
}
