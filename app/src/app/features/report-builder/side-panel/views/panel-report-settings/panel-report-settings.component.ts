import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS } from '../../../models/report.model';
import { ReportSession } from '../../../state/report-session';
import { PanelGroupComponent } from '../../panel-group.component';

/** Grid size for the active tab — each tab is its own surface, so this is per-tab. */
@Component({
  selector: 'app-panel-report-settings',
  imports: [FormsModule, InputNumberModule, PanelGroupComponent],
  templateUrl: './panel-report-settings.component.html',
})
export class PanelReportSettingsComponent {
  static readonly title = 'Tab settings';

  protected readonly defaultColumns = DEFAULT_GRID_COLUMNS;
  protected readonly defaultRows = DEFAULT_GRID_ROWS;

  private readonly session = inject(ReportSession);

  protected readonly gridColumns = this.session.gridColumns;
  protected readonly gridRows = this.session.gridRows;

  protected setGridColumns(value: number): void {
    this.session.setGridColumns(value);
  }

  protected setGridRows(value: number): void {
    this.session.setGridRows(value);
  }
}
