import {
  Component,
  effect,
  ElementRef,
  inject,
  Signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { DatasetColumn, DatasetColumnType, DatasetRow } from '../../../core/models/dataset';
import { DatasetsStore } from '../datasets.store';

@Component({
  selector: 'app-dataset-rows-panel',
  imports: [ButtonModule, SkeletonModule, TableModule],
  templateUrl: './dataset-rows-panel.component.html',
  styleUrl: './dataset-rows-panel.component.scss',
})
export class DatasetRowsPanelComponent {
  /** How many rows the grid pulls per lazy window, and each row's pixel height for the virtual scroller. */
  private static readonly ROW_WINDOW = 100;

  private static readonly ROW_HEIGHT = 37;

  public readonly rowHeight = DatasetRowsPanelComponent.ROW_HEIGHT;

  public readonly rowWindow = DatasetRowsPanelComponent.ROW_WINDOW;

  public readonly rowsLoading: WritableSignal<boolean>;

  public readonly rowsReady: Signal<boolean>;

  public readonly exporting: Signal<boolean>;

  /** A filtered dataset's rows come from its base — no add/edit/delete, but export still works. */
  public readonly isFiltered: Signal<boolean>;

  private readonly store = inject(DatasetsStore);

  private readonly host = inject(ElementRef);

  private readonly table = viewChild(Table);

  constructor() {
    this.rowsLoading = this.store.rowsLoading;
    this.rowsReady = this.store.rowsReady;
    this.exporting = this.store.exporting;
    this.isFiltered = this.store.isFiltered;
    // Bring a requested row (e.g. a freshly added last row) into view for editing.
    effect(() => {
      const index = this.store.rowScrollTo();
      if (index == null) {
        return;
      }
      this.store.clearRowScroll();
      // Let the remounted scroller settle, scroll to the row, then nudge a scroll event so it lazy-loads.
      setTimeout(() => {
        this.table()?.scrollToVirtualIndex(index);
        this.scroller()?.dispatchEvent(new Event('scroll'));
      }, 120);
    });
  }

  /** PrimeNG's lazy event: fires on mount and as the viewport scrolls; loads a window from there. */
  public onLazyLoad(event: TableLazyLoadEvent): void {
    this.store.loadRows(event.first ?? 0, DatasetRowsPanelComponent.ROW_WINDOW);
  }

  public addRow(): void {
    this.store.addRow();
  }

  /** Downloads the whole dataset as a CSV of its raw stored values. */
  public exportCsv(): void {
    this.store.exportCsv();
  }

  public setCell(row: DatasetRow, columnId: string, value: string): void {
    this.store.setCell(row, columnId, value);
  }

  public deleteRow(row: DatasetRow): void {
    this.store.deleteRow(row);
  }

  /** Native input type that best matches the column's stored type. */
  public inputType(type: DatasetColumnType): string {
    switch (type) {
      case 'int':
      case 'double':
        return 'number';
      case 'dateTime':
        return 'date';
      default:
        return 'text';
    }
  }

  /** Dates round-trip as ISO strings but the date input wants yyyy-MM-dd. */
  public cellValue(row: DatasetRow, column: DatasetColumn): string {
    const raw = row.values[column.id] ?? '';
    if (column.type !== 'dateTime' || !raw) {
      return raw;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }

  public isBool(column: DatasetColumn): boolean {
    return column.type === 'bool';
  }

  public get columns() {
    return this.store.columns;
  }

  public get rows() {
    return this.store.rows;
  }

  public get rowsTotal() {
    return this.store.rowsTotal;
  }

  private scroller(): HTMLElement | null {
    return (this.host.nativeElement as HTMLElement).querySelector('.p-virtualscroller');
  }
}
