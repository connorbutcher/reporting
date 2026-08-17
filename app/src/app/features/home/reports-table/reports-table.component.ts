import { DatePipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ContentRow, RowAction } from '../content-row';
import { HomeStore } from '../home.store';

/** The "Reports" section: a sortable table of reports, each openable or right-clickable for actions. */
@Component({
  selector: 'app-reports-table',
  imports: [DatePipe, TableModule],
  templateUrl: './reports-table.component.html',
  styleUrl: './reports-table.component.scss',
})
export class ReportsTableComponent {
  protected readonly store = inject(HomeStore);

  /** The shared context-menu overlay lives in the shell, so a right-click bubbles up for it. */
  readonly rowAction = output<RowAction>();

  protected onContextMenu(event: MouseEvent, row: ContentRow): void {
    event.preventDefault();
    this.rowAction.emit({ event, row });
  }

  protected onActions(event: MouseEvent, row: ContentRow): void {
    event.stopPropagation();
    this.rowAction.emit({ event, row });
  }
}
