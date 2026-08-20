import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS } from '../../../models/report.model';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelGroupComponent } from '../../panel-group.component';

@Component({
  selector: 'app-panel-report-settings',
  imports: [FormsModule, InputNumberModule, PanelGroupComponent],
  templateUrl: './panel-report-settings.component.html',
})
export class PanelReportSettingsComponent {
  static readonly title = 'Report settings';

  protected readonly defaultColumns = DEFAULT_GRID_COLUMNS;
  protected readonly defaultRows = DEFAULT_GRID_ROWS;

  private readonly store = inject(ReportBuilderStore);

  protected readonly model = this.store.model;
}
