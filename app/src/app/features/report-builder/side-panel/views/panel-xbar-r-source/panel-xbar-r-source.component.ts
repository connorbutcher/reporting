import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { XBarRChartWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The Xbar-R chart's data source: its dataset, the subgroup/value columns, and its row filter. */
@Component({
  selector: 'app-panel-xbar-r-source',
  imports: [FormsModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-xbar-r-source.component.html',
})
export class PanelXBarRSourceComponent {
  public readonly chart = input.required<XBarRChartWidgetModel>();

  /** The datasets on this report, for the data-source picker. */
  public readonly datasets = inject(ReportSession).datasets;

  private readonly navigation = inject(PanelNavigation);

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
