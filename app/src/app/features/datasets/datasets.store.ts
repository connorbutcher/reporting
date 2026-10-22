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

  public columnUses(columnId: string): readonly ColumnUse[] {
    return this.columnUsage.usesOf(columnId);
  }

  public columnTypeImpact(
    columnId: string,
    type: DatasetColumnType,
  ): Observable<ColumnTypeImpact> | null {
    return this.columnUsage.typeChangeImpact(columnId, type);
  }

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

  public datasetNameTaken(name: string): boolean {
    return this.collection.datasetNameTaken(name);
  }

  public cloneDataset(): void {
    this.collection.cloneDataset();
  }

  public deleteDataset(): void {
    this.collection.deleteDataset();
  }

  public setSource(sourceId: number): void {
    this.sourceCommands.setSource(sourceId);
  }

  public updateSourceConfig(config: DatasetSourceConfig): void {
    this.sourceCommands.updateSourceConfig(config);
  }

  public addColumn(name: string, type: DatasetColumnType): void {
    this.columnCommands.addColumn(name, type);
  }

  public renameColumn(column: DatasetColumn, name: string): void {
    this.columnCommands.renameColumn(column, name);
  }

  public retypeColumn(column: DatasetColumn, type: DatasetColumnType): void {
    this.columnCommands.retypeColumn(column, type);
  }

  public applyFormulaColumnSaved(column: DatasetColumn): void {
    this.columnCommands.applyFormulaColumnSaved(column);
  }

  public deleteColumn(column: DatasetColumn): void {
    this.columnCommands.deleteColumn(column);
  }

  public moveColumn(index: number, offset: number): void {
    this.columnCommands.moveColumn(index, offset);
  }

  public loadRows(first: number, count: number): void {
    this.rowWindow.load(first, count);
  }

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

  public exportCsv(): void {
    this.export.exportCsv();
  }

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

  public get nameConflictIds() {
    return this.validation.nameConflictIds;
  }

  public get datasetIssues() {
    return this.validation.selectedIssues;
  }

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

  /** True for a filtered view over another dataset, whose columns and rows are read-only. */
  public get isFiltered() {
    return this.schema.isFiltered;
  }

  public get schemaLoading() {
    return this.schema.schemaLoading;
  }

  public get error() {
    return this.schema.error;
  }

  public get columnUsageKnown() {
    return this.columnUsage.known;
  }

  public get columnUsageFailed() {
    return this.columnUsage.failed;
  }

  public get rows() {
    return this.rowWindow.rows;
  }

  public get rowsTotal() {
    return this.rowWindow.total;
  }

  public get rowsLoading() {
    return this.rowWindow.loading;
  }

  public get rowsReady() {
    return this.rowWindow.ready;
  }

  public get rowScrollTo() {
    return this.rowWindow.scrollTo;
  }

  public get saving() {
    return this.autosave.saving;
  }

  public get saveFailed() {
    return this.autosave.saveFailed;
  }

  public get exporting() {
    return this.export.exporting;
  }
}
