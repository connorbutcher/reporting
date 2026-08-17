import { Component, inject, output } from '@angular/core';
import { ContentRow, RowAction } from '../content-row';
import { HomeStore } from '../home.store';

/** The "Folders" section: child folders shown as chips, each openable or right-clickable for actions. */
@Component({
  selector: 'app-folder-chips',
  templateUrl: './folder-chips.component.html',
  styleUrl: './folder-chips.component.scss',
})
export class FolderChipsComponent {
  protected readonly store = inject(HomeStore);

  /** The shared context-menu overlay lives in the shell, so a right-click bubbles up for it. */
  readonly rowAction = output<RowAction>();

  /** Chips aren't p-table rows, so right-click needs its own wiring to the shared context menu. */
  protected onContextMenu(event: MouseEvent, row: ContentRow): void {
    event.preventDefault();
    this.rowAction.emit({ event, row });
  }

  protected onActions(event: MouseEvent, row: ContentRow): void {
    event.stopPropagation();
    this.rowAction.emit({ event, row });
  }
}
