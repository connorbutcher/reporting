import { Component, input, output } from '@angular/core';

/** The screenshot, data download and full screen buttons in an exportable widget's header. */
@Component({
  selector: 'app-widget-export-actions',
  templateUrl: './widget-export-actions.component.html',
  styleUrl: './widget-export-actions.component.scss',
})
export class WidgetExportActionsComponent {
  /** Off inside the full screen dialog. */
  readonly expandable = input(true);

  readonly screenshot = output<void>();
  readonly exportCsv = output<void>();
  readonly expand = output<void>();
}
