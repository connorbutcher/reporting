import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { LineChartWidgetModel } from '../../models/widget.model';

/** The line-only appearance options (smooth, show points, area fill). */
@Component({
  selector: 'app-panel-line-chart-options',
  imports: [FormsModule, CheckboxModule],
  template: `
    <div class="panel-inline-field">
      <p-checkbox
        [binary]="true"
        inputId="chart-smooth"
        [ngModel]="chart().smooth()"
        (onChange)="chart().smooth.set($event.checked)"
      />
      <label for="chart-smooth">Smooth</label>
    </div>
    <div class="panel-inline-field">
      <p-checkbox
        [binary]="true"
        inputId="chart-show-points"
        [ngModel]="chart().showPoints()"
        (onChange)="chart().showPoints.set($event.checked)"
      />
      <label for="chart-show-points">Show points</label>
    </div>
    <div class="panel-inline-field">
      <p-checkbox
        [binary]="true"
        inputId="chart-area-fill"
        [ngModel]="chart().areaFill()"
        (onChange)="chart().areaFill.set($event.checked)"
      />
      <label for="chart-area-fill">Area fill</label>
    </div>
  `,
})
export class PanelLineChartOptionsComponent {
  readonly chart = input.required<LineChartWidgetModel>();
}
