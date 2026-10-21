import { signal } from '@angular/core';
import { TableDensity } from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { ValidationIssue } from './validation-issue';
import { TableAppearanceDto } from './table-appearance.dto';

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
  readonly showTotals = signal(false);
  readonly showSearch = signal(false);
  readonly frozenColumns = signal(0);
  readonly rowDetails = signal(true);

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
    this.showTotals.set(dto.showTotals ?? false);
    this.showSearch.set(dto.showSearch ?? false);
    this.frozenColumns.set(dto.frozenColumns ?? 0);
    this.rowDetails.set(dto.rowDetails ?? true);
  }

  /** The notable settings, for the panel's summary line. */
  summary(): string {
    const parts: string[] = [this.density()];
    if (this.resizableColumns()) parts.push('resizable');
    if (this.paginator()) parts.push('paginated');
    if (this.showTotals()) parts.push('totals');
    if (this.showSearch()) parts.push('search');
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
      showTotals: this.showTotals(),
      showSearch: this.showSearch(),
      frozenColumns: this.frozenColumns(),
      rowDetails: this.rowDetails(),
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
