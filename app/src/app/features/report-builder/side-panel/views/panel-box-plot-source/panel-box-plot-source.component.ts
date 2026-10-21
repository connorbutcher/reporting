import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { BoxPlotWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

@Component({
  selector: 'app-panel-box-plot-source',
  imports: [FormsModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-box-plot-source.component.html',
})
export class PanelBoxPlotSourceComponent {
  public readonly chart = input.required<BoxPlotWidgetModel>();

  public readonly datasets = inject(ReportSession).datasets;

  private readonly navigation = inject(PanelNavigation);

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
