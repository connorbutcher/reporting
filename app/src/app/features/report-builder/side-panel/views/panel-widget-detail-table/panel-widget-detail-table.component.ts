import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DataTableWidgetModel } from '../../../models/widget.model';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The table branch of the widget-detail panel: dataset, columns, filters, and appearance. */
@Component({
  selector: 'app-panel-widget-detail-table',
  imports: [FormsModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-widget-detail-table.component.html',
})
export class PanelWidgetDetailTableComponent {
  private readonly store = inject(ReportBuilderStore);

  readonly table = input.required<DataTableWidgetModel>();

  /** The datasets on this report, for the data-source picker. */
  protected readonly datasets = this.store.datasets;

  protected navigate(view: PanelView): void {
    this.store.navigate(view);
  }
}
