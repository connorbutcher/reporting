import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelGroupComponent } from '../../panel-group.component';

@Component({
  selector: 'app-panel-report-settings',
  imports: [FormsModule, InputNumberModule, PanelGroupComponent],
  templateUrl: './panel-report-settings.component.html',
})
export class PanelReportSettingsComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly model = this.store.model;
}
