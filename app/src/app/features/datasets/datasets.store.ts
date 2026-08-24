import { Injectable, inject } from '@angular/core';
import {
  DatasetColumn,
  DatasetColumnType,
  DatasetRow,
  DatasetSourceConfig,
} from '../../core/models/dataset';
import { DatasetAutosave } from './state/dataset-autosave';
import { DatasetCollection } from './state/dataset-collection';
import { DatasetColumnCommands } from './state/dataset-column-commands';
import { DatasetExport } from './state/dataset-export';
import { DatasetRowCommands } from './state/dataset-row-commands';
import { DatasetRowWindow } from './state/dataset-row-window';
import { DatasetSchemaState } from './state/dataset-schema-state';
import { DatasetSourceCommands } from './state/dataset-source-commands';
import { DatasetValidation } from './state/dataset-validation';

/**
 * State and CRUD for the datasets screen. Datasets belong to a report's draft
 * revision, so the store is scoped to a report id (set by the page from the
 * route). Provided at the page so the list sidebar and the editor share one
 * instance, keeping every mutation in one place while the components stay
 * presentational.
 *
 * This is a thin facade: the work is split across focused, component-provided
 * collaborator services — {@link DatasetAutosave} (save status),
 * {@link DatasetCollection} (list, selection, dataset lifecycle),
 * {@link DatasetSchemaState} (the selected dataset's editable schema and rows),
 * and the {@link DatasetColumnCommands} / {@link DatasetRowCommands} /
 * {@link DatasetSourceCommands} command services. The store re-exposes their
 * signals and methods verbatim so every consumer still injects only
 * {@link DatasetsStore}. The collaborators are provided alongside it on the page
 * (see the page's `providers`) and injected here — never `new`'d — so each is a
 * first-class service Angular constructs and can inject its own dependencies.
 */
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

  // --- list & selection (DatasetCollection) ---------------------------------
  readonly sources = this.collection.sources;
  readonly datasets = this.collection.datasets;
  readonly datasetsLoading = this.collection.datasetsLoading;
  readonly listError = this.collection.listError;
  readonly selectedId = this.collection.selectedId;
  readonly selected = this.collection.selected;

  // --- validation (DatasetValidation) ---------------------------------------
  /** Dataset ids that share a name with another, for the list's invalid markers. */
  readonly nameConflictIds = this.validation.nameConflictIds;
  /** The selected dataset's validation problems, for the editor's issues banner. */
  readonly datasetIssues = this.validation.selectedIssues;

  // --- selected dataset's schema (DatasetSchemaState) ------------------------
  readonly columns = this.schema.columns;
  readonly source = this.schema.source;
  readonly sourceId = this.schema.sourceId;
  readonly sourceConfig = this.schema.sourceConfig;
  readonly schemaLoading = this.schema.schemaLoading;
  readonly error = this.schema.error;

  // --- selected dataset's rows, lazily windowed (DatasetRowWindow) -----------
  /** The sparse row array bound to the grid's lazy virtual scroll; loaded windows are filled in. */
  readonly rows = this.rowWindow.rows;
  /** The dataset's full row count, for the grid's scrollbar. */
  readonly rowsTotal = this.rowWindow.total;
  /** True while a row window is loading, for the grid's loading overlay. */
  readonly rowsLoading = this.rowWindow.loading;
  /** True once the first window has loaded, so the grid can mount with a known total. */
  readonly rowsReady = this.rowWindow.ready;
  /** A row index the grid should scroll into view (e.g. a newly added row); null when none. */
  readonly rowScrollTo = this.rowWindow.scrollTo;

  // --- save status (DatasetAutosave) ----------------------------------------
  readonly saving = this.autosave.saving;
  readonly saveFailed = this.autosave.saveFailed;

  // --- dataset lifecycle (DatasetCollection) --------------------------------
  setReport(reportId: number): void {
    this.collection.setReport(reportId);
  }

  select(id: number): void {
    this.collection.select(id);
  }

  createDataset(name: string, sourceId: number): void {
    this.collection.createDataset(name, sourceId);
  }

  renameDataset(name: string): void {
    this.collection.renameDataset(name);
  }

  /** True when another dataset already uses this name — for the toolbar to reject a rename. */
  datasetNameTaken(name: string): boolean {
    return this.collection.datasetNameTaken(name);
  }

  cloneDataset(): void {
    this.collection.cloneDataset();
  }

  deleteDataset(): void {
    this.collection.deleteDataset();
  }

  // --- source (DatasetSourceCommands) ---------------------------------------
  setSource(sourceId: number): void {
    this.sourceCommands.setSource(sourceId);
  }

  updateSourceConfig(config: DatasetSourceConfig): void {
    this.sourceCommands.updateSourceConfig(config);
  }

  // --- columns (DatasetColumnCommands) --------------------------------------
  addColumn(name: string, type: DatasetColumnType): void {
    this.columnCommands.addColumn(name, type);
  }

  renameColumn(column: DatasetColumn, name: string): void {
    this.columnCommands.renameColumn(column, name);
  }

  retypeColumn(column: DatasetColumn, type: DatasetColumnType): void {
    this.columnCommands.retypeColumn(column, type);
  }

  deleteColumn(column: DatasetColumn): void {
    this.columnCommands.deleteColumn(column);
  }

  moveColumn(index: number, offset: number): void {
    this.columnCommands.moveColumn(index, offset);
  }

  // --- rows (DatasetRowWindow + DatasetRowCommands) -------------------------
  /** Loads the row window the grid is scrolled to; driven by the table's lazy-load event. */
  loadRows(first: number, count: number): void {
    this.rowWindow.load(first, count);
  }

  /** Clears the pending scroll-to request once the grid has honoured it. */
  clearRowScroll(): void {
    this.rowWindow.scrollTo.set(null);
  }

  addRow(): void {
    this.rowCommands.addRow();
  }

  setCell(row: DatasetRow, columnId: string, value: string): void {
    this.rowCommands.setCell(row, columnId, value);
  }

  deleteRow(row: DatasetRow): void {
    this.rowCommands.deleteRow(row);
  }

  // --- export (DatasetExport) -----------------------------------------------
  /** True while the whole dataset is being fetched and packaged for download. */
  readonly exporting = this.export.exporting;

  /** Downloads the selected dataset as a CSV of its raw stored values. */
  exportCsv(): void {
    this.export.exportCsv();
  }
}
