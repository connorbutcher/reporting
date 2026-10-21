import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabModel } from '../../../models/tab.model';
import { ReportSession } from '../../../state/report-session';
import { PanelGroupComponent } from '../../panel-group.component';

/** The active tab's grid size. */
@Component({
  selector: 'app-panel-report-settings',
  imports: [FormsModule, InputNumberModule, PanelGroupComponent],
  templateUrl: './panel-report-settings.component.html',
})
export class PanelReportSettingsComponent {
  public static readonly title = 'Tab settings';

  public readonly defaultColumns = TabModel.DEFAULT_GRID_COLUMNS;
  public readonly defaultRows = TabModel.DEFAULT_GRID_ROWS;

  private readonly session = inject(ReportSession);

  public setGridColumns(value: number): void {
    this.session.setGridColumns(value);
  }

  public setGridRows(value: number): void {
    this.session.setGridRows(value);
  }

  public get gridColumns() {
    return this.session.gridColumns;
  }

  public get gridRows() {
    return this.session.gridRows;
  }
}
