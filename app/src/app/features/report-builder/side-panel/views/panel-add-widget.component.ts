import { Component, inject } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';

@Component({
  selector: 'app-panel-add-widget',
  imports: [],
  template: `
    <div class="panel-section">
      <p class="panel-hint">
        Pick a widget to place on the canvas. You choose its content afterwards.
      </p>
      <button type="button" class="panel-menu-item" (click)="store.addWidget('dataTable')">
        <i class="pi pi-table" aria-hidden="true"></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Table</span>
          <span class="panel-menu-hint">Rows and columns from a dataset</span>
        </span>
        <i class="pi pi-plus" aria-hidden="true"></i>
      </button>
      <button type="button" class="panel-menu-item" (click)="store.addWidget('staticText')">
        <i class="pi pi-align-left" aria-hidden="true"></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Text</span>
          <span class="panel-menu-hint">A styled heading or block of text</span>
        </span>
        <i class="pi pi-plus" aria-hidden="true"></i>
      </button>
      <button type="button" class="panel-menu-item" (click)="store.addWidget('chart')">
        <i class="pi pi-chart-scatter" aria-hidden="true"></i>
        <span class="panel-menu-text">
          <span class="panel-menu-label">Chart</span>
          <span class="panel-menu-hint">Plot two columns from a dataset</span>
        </span>
        <i class="pi pi-plus" aria-hidden="true"></i>
      </button>
    </div>
  `,
})
export class PanelAddWidgetComponent {
  protected readonly store = inject(ReportBuilderStore);
}
