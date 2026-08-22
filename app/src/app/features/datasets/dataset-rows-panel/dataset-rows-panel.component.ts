import { Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { DatasetColumn, DatasetColumnType, DatasetRow } from '../../../core/models/dataset.model';
import { DatasetsStore } from '../datasets.store';

/** How many rows the grid pulls per lazy window, and each row's pixel height for the virtual scroller. */
const ROW_WINDOW = 100;
const ROW_HEIGHT = 37;

/**
 * The selected dataset's row data, as an editable grid. Rows load from the server
 * a window at a time through a PrimeNG lazy virtual scroll table, so a dataset
 * with thousands of rows never loads into the editor in full.
 */
@Component({
  selector: 'app-dataset-rows-panel',
  imports: [ButtonModule, SkeletonModule, TableModule],
  templateUrl: './dataset-rows-panel.component.html',
  styleUrl: './dataset-rows-panel.component.scss',
})
export class DatasetRowsPanelComponent {
  private readonly store = inject(DatasetsStore);
  private readonly api = inject(DatasetApiService);
  private readonly host = inject(ElementRef);
  private readonly table = viewChild(Table);

  private scroller(): HTMLElement | null {
    return (this.host.nativeElement as HTMLElement).querySelector('.p-virtualscroller');
  }

  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly rowWindow = ROW_WINDOW;

  protected readonly columns = this.store.columns;
  protected readonly selectedId = this.store.selectedId;
  protected readonly rows = this.store.rows;
  protected readonly rowsTotal = this.store.rowsTotal;
  protected readonly rowsLoading = this.store.rowsLoading;
  protected readonly rowsReady = this.store.rowsReady;

  private readonly datasetName = computed(() => this.store.selected()?.name ?? 'dataset');

  constructor() {
    // Bring a requested row (e.g. a freshly added last row) into view for editing.
    effect(() => {
      const index = this.store.rowScrollTo();
      if (index == null) return;
      this.store.clearRowScroll();
      // The grid has just remounted; let its virtual scroller settle, then scroll
      // to the row via PrimeNG's API and nudge a scroll event so it recomputes the
      // rendered range (and lazy-loads that window) at the new position.
      setTimeout(() => {
        this.table()?.scrollToVirtualIndex(index);
        this.scroller()?.dispatchEvent(new Event('scroll'));
      }, 120);
    });
  }

  /** PrimeNG's lazy event: fires on mount and as the viewport scrolls; loads a window from there. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.store.loadRows(event.first ?? 0, ROW_WINDOW);
  }

  protected addRow(): void {
    this.store.addRow();
  }

  /**
   * Downloads the whole dataset as a CSV, with the raw stored values. Fetches every
   * row from the server (the grid only holds the windows it has scrolled through).
   */
  protected exportCsv(): void {
    const columns = this.columns();
    const id = this.selectedId();
    if (columns.length === 0 || id == null) return;

    this.api.getData(id).subscribe((data) => {
      const header = columns.map((c) => this.csvCell(c.name));
      const body = data.rows.map((row) => columns.map((c) => this.csvCell(row.values[c.id] ?? '')));
      const csv = [header, ...body].map((cells) => cells.join(',')).join('\r\n');

      // A BOM keeps Excel from mangling non-ASCII characters.
      const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.fileName()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  /** Quotes a value only when it contains a delimiter, quote or newline (RFC 4180). */
  private csvCell(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }

  private fileName(): string {
    return this.datasetName().replace(/[^\w.-]+/g, '_') || 'dataset';
  }

  protected setCell(row: DatasetRow, columnId: string, value: string): void {
    this.store.setCell(row, columnId, value);
  }

  protected deleteRow(row: DatasetRow): void {
    this.store.deleteRow(row);
  }

  /** Native input type that best matches the column's stored type. */
  protected inputType(type: DatasetColumnType): string {
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
  protected cellValue(row: DatasetRow, column: DatasetColumn): string {
    const raw = row.values[column.id] ?? '';
    if (column.type !== 'dateTime' || !raw) return raw;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }

  protected isBool(column: DatasetColumn): boolean {
    return column.type === 'bool';
  }
}
