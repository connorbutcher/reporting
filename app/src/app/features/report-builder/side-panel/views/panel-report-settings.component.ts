import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

@Component({
  selector: 'app-panel-report-settings',
  imports: [FormsModule, InputNumberModule, PanelGroupComponent],
  template: `
    @if (store.model(); as model) {
      <div class="panel-section">
        <app-panel-group label="Grid" icon="▦">
          <label class="panel-field">
            <span class="panel-field-label">Columns</span>
            <p-inputnumber
              [ngModel]="model.gridColumns()"
              (ngModelChange)="model.setGridColumns($event ?? 12)"
              [min]="1"
              [max]="48"
              [showButtons]="true"
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              fluid
            />
          </label>
          <label class="panel-field">
            <span class="panel-field-label">Rows</span>
            <p-inputnumber
              [ngModel]="model.gridRows()"
              (ngModelChange)="model.setGridRows($event ?? 10)"
              [min]="1"
              [max]="48"
              [showButtons]="true"
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              fluid
            />
          </label>
        </app-panel-group>
      </div>
    }
  `,
})
export class PanelReportSettingsComponent {
  protected readonly store = inject(ReportBuilderStore);
}
