import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ColumnTypeImpact,
  DatasetColumn,
  ColumnUse,
  DatasetColumnType,
  DatasetRow,
  DatasetSourceConfig,
} from '../../core/models/dataset';
import { DatasetAutosave } from './state/dataset-autosave';
import { DatasetCollection } from './state/dataset-collection';
import { DatasetColumnCommands } from './state/dataset-column-commands';
import { DatasetColumnUsage } from './state/dataset-column-usage';
import { DatasetExport } from './state/dataset-export';
import { DatasetRowCommands } from './state/dataset-row-commands';
import { DatasetRowWindow } from './state/dataset-row-window';
import { DatasetSchemaState } from './state/dataset-schema-state';
import { DatasetSourceCommands } from './state/dataset-source-commands';
import { DatasetValidation } from './state/dataset-validation';

@Injectable()
export class DatasetsStore {
  private readonly autosave = inject(DatasetAutosave);

  private readonly collection = inject(DatasetCollection);

  private readonly schema = inject(DatasetSchemaState);

  private readonly rowWindow = inject(DatasetRowWindow);

  private readonly columnCommands = inject(DatasetColumnCommands);

  private readonly rowCommands = inject(DatasetRowCommands);

  private readonly sourceCommands = inject(DatasetSourceCommands);

  private readonly export = inject(DatasetExport);

  private readonly validation = inject(DatasetValidation);

  private readonly columnUsage = inject(DatasetColumnUsage);

  /** Every widget/filter use of a column in the report's draft, in tab and widget order. */
  public columnUses(columnId: string): readonly ColumnUse[] {
    return this.columnUsage.usesOf(columnId);
  }

  /** What giving a column another type would newly break, or null with no dataset selected. */
  public columnTypeImpact(
    columnId: string,
    type: DatasetColumnType,
  ): Observable<ColumnTypeImpact> | null {
    return this.columnUsage.typeChangeImpact(columnId, type);
  }

  // --- dataset lifecycle (DatasetCollection) --------------------------------
  public setReport(reportId: number): void {
    this.collection.setReport(reportId);
  }

  public select(id: number): void {
    this.collection.select(id);
  }

  public createDataset(name: string, sourceId: number): void {
    this.collection.createDataset(name, sourceId);
  }

  public renameDataset(name: string): void {
    this.collection.renameDataset(name);
  }

  /** True when another dataset already uses this name — for the toolbar to reject a rename. */
  public datasetNameTaken(name: string): boolean {
    return this.collection.datasetNameTaken(name);
  }

  public cloneDataset(): void {
    this.collection.cloneDataset();
  }

  public deleteDataset(): void {
    this.collection.deleteDataset();
  }

  // --- source (DatasetSourceCommands) ---------------------------------------
  public setSource(sourceId: number): void {
    this.sourceCommands.setSource(sourceId);
  }

  public updateSourceConfig(config: DatasetSourceConfig): void {
    this.sourceCommands.updateSourceConfig(config);
  }

  // --- columns (DatasetColumnCommands) --------------------------------------
  public addColumn(name: string, type: DatasetColumnType): void {
    this.columnCommands.addColumn(name, type);
  }

  public renameColumn(column: DatasetColumn, name: string): void {
    this.columnCommands.renameColumn(column, name);
  }

  public retypeColumn(column: DatasetColumn, type: DatasetColumnType): void {
    this.columnCommands.retypeColumn(column, type);
  }

  /** Takes on a formula column the builder dialog saved. */
  public applyFormulaColumnSaved(column: DatasetColumn): void {
    this.columnCommands.applyFormulaColumnSaved(column);
  }

  public deleteColumn(column: DatasetColumn): void {
    this.columnCommands.deleteColumn(column);
  }

  public moveColumn(index: number, offset: number): void {
    this.columnCommands.moveColumn(index, offset);
  }

  // --- rows (DatasetRowWindow + DatasetRowCommands) -------------------------
  /** Loads the row window the grid is scrolled to; driven by the table's lazy-load event. */
  public loadRows(first: number, count: number): void {
    this.rowWindow.load(first, count);
  }

  /** Clears the pending scroll-to request once the grid has honoured it. */
  public clearRowScroll(): void {
    this.rowWindow.scrollTo.set(null);
  }

  public addRow(): void {
    this.rowCommands.addRow();
  }

  public setCell(row: DatasetRow, columnId: string, value: string): void {
    this.rowCommands.setCell(row, columnId, value);
  }

  public deleteRow(row: DatasetRow): void {
    this.rowCommands.deleteRow(row);
  }

  /** Downloads the selected dataset as a CSV of its raw stored values. */
  public exportCsv(): void {
    this.export.exportCsv();
  }

  // --- list & selection (DatasetCollection) ---------------------------------
  public get sources() {
    return this.collection.sources;
  }

  public get datasets() {
    return this.collection.datasets;
  }

  public get datasetsLoading() {
    return this.collection.datasetsLoading;
  }

  public get listError() {
    return this.collection.listError;
  }

  public get selectedId() {
    return this.collection.selectedId;
  }

  public get selected() {
    return this.collection.selected;
  }

  // --- validation (DatasetValidation) ---------------------------------------
  /** Dataset ids that share a name with another, for the list's invalid markers. */
  public get nameConflictIds() {
    return this.validation.nameConflictIds;
  }

  /** The selected dataset's validation problems, for the editor's issues banner. */
  public get datasetIssues() {
    return this.validation.selectedIssues;
  }

  // --- selected dataset's schema (DatasetSchemaState) ------------------------
  public get columns() {
    return this.schema.columns;
  }

  public get source() {
    return this.schema.source;
  }

  public get sourceId() {
    return this.schema.sourceId;
  }

  public get sourceConfig() {
    return this.schema.sourceConfig;
  }

  /** True when the selected dataset is a filtered view over another — its columns/rows are read-only. */
  public get isFiltered() {
    return this.schema.isFiltered;
  }

  public get schemaLoading() {
    return this.schema.schemaLoading;
  }

  public get error() {
    return this.schema.error;
  }

  // --- where the columns are used in the report (DatasetColumnUsage) ---------
  /** True once the selected dataset's column usage has loaded. */
  public get columnUsageKnown() {
    return this.columnUsage.known;
  }

  /** True when the column usage couldn't be loaded, so a delete can't say what it would break. */
  public get columnUsageFailed() {
    return this.columnUsage.failed;
  }

  // --- selected dataset's rows, lazily windowed (DatasetRowWindow) -----------
  /** The sparse row array bound to the grid's lazy virtual scroll; loaded windows are filled in. */
  public get rows() {
    return this.rowWindow.rows;
  }

  /** The dataset's full row count, for the grid's scrollbar. */
  public get rowsTotal() {
    return this.rowWindow.total;
  }

  /** True while a row window is loading, for the grid's loading overlay. */
  public get rowsLoading() {
    return this.rowWindow.loading;
  }

  /** True once the first window has loaded, so the grid can mount with a known total. */
  public get rowsReady() {
    return this.rowWindow.ready;
  }

  /** A row index the grid should scroll into view (e.g. a newly added row); null when none. */
  public get rowScrollTo() {
    return this.rowWindow.scrollTo;
  }

  // --- save status (DatasetAutosave) ----------------------------------------
  public get saving() {
    return this.autosave.saving;
  }

  public get saveFailed() {
    return this.autosave.saveFailed;
  }

  // --- export (DatasetExport) -----------------------------------------------
  /** True while the whole dataset is being fetched and packaged for download. */
  public get exporting() {
    return this.export.exporting;
  }
}
