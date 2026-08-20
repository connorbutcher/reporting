import { Component, inject } from '@angular/core';
import { widgetTypesByGroup } from '../../../../../core/models/widget-catalog';
import { WidgetType } from '../../../../../core/models/report.model';
import { ReportBuilderStore } from '../../../report-builder.store';

@Component({
  selector: 'app-panel-add-widget',
  templateUrl: './panel-add-widget.component.html',
  styleUrl: './panel-add-widget.component.scss',
})
export class PanelAddWidgetComponent {
  static readonly title = 'Add widget';

  private readonly store = inject(ReportBuilderStore);

  protected readonly groups = widgetTypesByGroup();

  protected addWidget(type: WidgetType): void {
    this.store.addWidget(type);
  }
}
