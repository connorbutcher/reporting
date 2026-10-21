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
  public static readonly title = 'Add widget';

  public readonly groups = widgetTypesByGroup();

  private readonly commands = inject(WidgetCommands);

  public addWidget(type: WidgetType): void {
    this.commands.addWidget(type);
  }
}
