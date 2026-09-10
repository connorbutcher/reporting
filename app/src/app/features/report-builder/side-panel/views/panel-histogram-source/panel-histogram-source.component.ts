import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { HistogramWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The histogram's data source: its dataset, the value/split columns, and its row filter. */
@Component({
  selector: 'app-panel-histogram-source',
  imports: [FormsModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-histogram-source.component.html',
})
export class PanelHistogramSourceComponent {
  public readonly chart = input.required<HistogramWidgetModel>();

  /** The datasets on this report, for the data-source picker. */
  public readonly datasets = inject(ReportSession).datasets;

  private readonly navigation = inject(PanelNavigation);

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
