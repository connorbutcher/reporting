import { Component, input, output } from '@angular/core';

/** The view data, screenshot, data download and full screen buttons in an exportable widget's header. */
@Component({
  selector: 'app-widget-export-actions',
  templateUrl: './widget-export-actions.component.html',
  styleUrl: './widget-export-actions.component.scss',
})
export class WidgetExportActionsComponent {
  /** Off inside the full screen dialog. */
  public readonly expandable = input(true);
  /** On when the widget can show its values in a dialog. */
  public readonly viewable = input(false);
  public readonly viewData = output<void>();
  public readonly screenshot = output<void>();
  public readonly exportCsv = output<void>();
  public readonly expand = output<void>();
}
