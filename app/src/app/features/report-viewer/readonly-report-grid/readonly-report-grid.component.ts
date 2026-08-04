import { Component, input } from '@angular/core';
import { CELL_SIZE, GRID_GAP } from '../../report-builder/grid.util';
import { ReportRevisionContent } from '../../../core/models/report.model';
import { DataTableWidgetComponent } from '../../report-builder/widgets/data-table-widget/data-table-widget.component';
import { StaticTextWidgetComponent } from '../../report-builder/widgets/static-text-widget/static-text-widget.component';

/** Renders a report's widgets on the grid with no drag, resize, or selection chrome. */
@Component({
  selector: 'app-readonly-report-grid',
  imports: [DataTableWidgetComponent, StaticTextWidgetComponent],
  templateUrl: './readonly-report-grid.component.html',
  styleUrl: './readonly-report-grid.component.scss',
})
export class ReadonlyReportGridComponent {
  readonly content = input.required<ReportRevisionContent>();

  protected readonly cellSize = CELL_SIZE;
  protected readonly gridGap = GRID_GAP;
}
