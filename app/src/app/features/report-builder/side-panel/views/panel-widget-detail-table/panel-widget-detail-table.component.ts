import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DataTableWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The table branch of the widget-detail panel: dataset, columns, filters, and appearance. */
@Component({
  selector: 'app-panel-widget-detail-table',
  imports: [FormsModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-widget-detail-table.component.html',
})
export class PanelWidgetDetailTableComponent {
  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  readonly table = input.required<DataTableWidgetModel>();

  /** The datasets on this report, for the data-source picker. */
  protected readonly datasets = this.session.datasets;

  protected navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
