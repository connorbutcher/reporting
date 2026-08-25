import { Component, inject } from '@angular/core';
import { widgetTypesByGroup } from '../../../../../core/models/widget-catalog';
import { WidgetType } from '../../../../../core/models/report';
import { WidgetCommands } from '../../../state/widget-commands';

@Component({
  selector: 'app-panel-add-widget',
  templateUrl: './panel-add-widget.component.html',
  styleUrl: './panel-add-widget.component.scss',
})
export class PanelAddWidgetComponent {
  static readonly title = 'Add widget';

  private readonly commands = inject(WidgetCommands);

  protected readonly groups = widgetTypesByGroup();

  protected addWidget(type: WidgetType): void {
    this.commands.addWidget(type);
  }
}
