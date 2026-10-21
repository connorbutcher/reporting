import { Component, input, output } from '@angular/core';

/** The screenshot, data download and full screen buttons in an exportable widget's header. */
@Component({
  selector: 'app-widget-export-actions',
  templateUrl: './widget-export-actions.component.html',
  styleUrl: './widget-export-actions.component.scss',
})
export class WidgetExportActionsComponent {
  /** Off inside the full screen dialog. */
  public readonly expandable = input(true);
  public readonly screenshot = output<void>();
  public readonly exportCsv = output<void>();
  public readonly expand = output<void>();
}
