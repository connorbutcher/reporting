import { signal } from '@angular/core';
import { DataTableWidgetConfig, TableDensity } from '../../../core/models/report.model';
import { EditorNode } from './editor-node';
import { ValidationIssue } from './validation-issue';

/** The presentation options for a table, independent of which data it shows. */
export type TableAppearanceDto = Pick<
  DataTableWidgetConfig,
  | 'showColumnHeaders'
  | 'resizableColumns'
  | 'stripedRows'
  | 'showGridlines'
  | 'rowHover'
  | 'density'
  | 'paginator'
  | 'rowsPerPage'
  | 'emptyMessage'
>;

export class TableAppearanceModel extends EditorNode {
  readonly showColumnHeaders = signal(true);
  readonly resizableColumns = signal(false);
  readonly stripedRows = signal(false);
  readonly showGridlines = signal(false);
  readonly rowHover = signal(true);
  readonly density = signal<TableDensity>('compact');
  readonly paginator = signal(false);
  readonly rowsPerPage = signal(10);
  readonly emptyMessage = signal('No rows to display.');

  constructor(
    private readonly widgetId: string,
    dto: TableAppearanceDto,
  ) {
    super();
    this.showColumnHeaders.set(dto.showColumnHeaders);
    this.resizableColumns.set(dto.resizableColumns);
    this.stripedRows.set(dto.stripedRows);
    this.showGridlines.set(dto.showGridlines);
    this.rowHover.set(dto.rowHover);
    this.density.set(dto.density);
    this.paginator.set(dto.paginator);
    this.rowsPerPage.set(dto.rowsPerPage);
    this.emptyMessage.set(dto.emptyMessage);
  }

  /** A short description of the notable settings, for the panel summary line. */
  summary(): string {
    const parts: string[] = [this.density()];
    if (this.resizableColumns()) parts.push('resizable');
    if (this.paginator()) parts.push('paginated');
    return parts.join(' · ');
  }

  toDto(): TableAppearanceDto {
    return {
      showColumnHeaders: this.showColumnHeaders(),
      resizableColumns: this.resizableColumns(),
      stripedRows: this.stripedRows(),
      showGridlines: this.showGridlines(),
      rowHover: this.rowHover(),
      density: this.density(),
      paginator: this.paginator(),
      rowsPerPage: this.rowsPerPage(),
      emptyMessage: this.emptyMessage(),
    };
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return [];
  }

  protected override ownIssues(): ValidationIssue[] {
    if (!this.paginator() || this.rowsPerPage() >= 1) return [];

    return [
      {
        id: `${this.widgetId}:rowsPerPage`,
        severity: 'error',
        title: 'A table has an invalid page size',
        detail: 'Rows per page must be at least 1 while pagination is on.',
        widgetId: this.widgetId,
        view: { kind: 'tableAppearance', widgetId: this.widgetId },
      },
    ];
  }
}
