import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Injectable, Signal, WritableSignal, inject } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { DatasetColumn, DatasetColumnType, FormulaFunction, FormulaPreview, FormulaValueKind } from '../../../core/models/dataset';
import {
  Expression,
  ExpressionAddress,
  FormulaIssue,
  FormulaItem,
  SelectionRange,
  SerializedFormula,
  FormulaScope,
} from './model';
import { DragPayload } from './store/drag-payload';
import { DropPoint } from './store/drop-point';
import { FormulaBuilderData } from './store/formula-builder-data';
import { FormulaCatalogue } from './store/formula-catalogue';
import { FormulaChecking } from './store/formula-checking';
import { FormulaColumnForm } from './store/formula-column-form';
import { FormulaDocument } from './store/formula-document';
import { FormulaEditing } from './store/formula-editing';
import { FormulaInteraction } from './store/formula-interaction';
import { FormulaLoader } from './store/formula-loader';
import { FormulaSaver } from './store/formula-saver';
import { FormulaSelection } from './store/formula-selection';
import { PalettePayload } from './store/palette-payload';
import { SelectMode } from './store/select-mode';

/**
 * The formula builder dialog's state, as one face for the panels inside it. The work is done by focused
 * collaborators, all provided on the dialog: the document and its undo history, the catalogue, the checks,
 * the selection, the editing commands, the transient interaction state, the name and type form, saving and
 * loading. Provided on the dialog, so the palette, canvas, readout and preview all share it.
 */
@Injectable()
export class FormulaBuilderStore {
  public readonly data = inject<FormulaBuilderData>(DIALOG_DATA);

  private readonly document = inject(FormulaDocument);
  private readonly catalogue = inject(FormulaCatalogue);
  private readonly checking = inject(FormulaChecking);
  private readonly selection = inject(FormulaSelection);
  private readonly editing = inject(FormulaEditing);
  private readonly interaction = inject(FormulaInteraction);
  private readonly columnForm = inject(FormulaColumnForm);
  private readonly saver = inject(FormulaSaver);
  private readonly loader = inject(FormulaLoader);

  public undo(): void {
    this.document.undo();
  }

  public redo(): void {
    this.document.redo();
  }

  public toggleCollapsed(id: number): void {
    this.interaction.toggleCollapsed(id);
  }

  public flash(issue: FormulaIssue): void {
    this.interaction.flash(issue);
  }

  public canDropAt(address: ExpressionAddress): boolean {
    return this.editing.canDropAt(address);
  }

  public drop(address: ExpressionAddress, index: number): void {
    this.editing.drop(address, index);
  }

  public add(payload: PalettePayload): void {
    this.editing.add(payload);
  }

  public typeInto(address: ExpressionAddress, text: string): void {
    this.editing.typeInto(address, text);
  }

  public setLiteral(id: number, text: string): void {
    this.editing.setLiteral(id, text);
  }

  public remove(id: number): void {
    this.editing.remove(id);
  }

  public addArgument(functionId: number): void {
    this.editing.addArgument(functionId);
  }

  public removeArgument(functionId: number, index: number): void {
    this.editing.removeArgument(functionId, index);
  }

  public clear(): void {
    this.editing.clear();
  }

  public select(id: number, mode: SelectMode): void {
    this.selection.select(id, mode);
  }

  public clearSelection(): void {
    this.selection.clearSelection();
  }

  public wrapSelectionInBrackets(): void {
    this.selection.wrapInBrackets();
  }

  public wrapSelectionInFunction(name: string): void {
    this.selection.wrapInFunction(name);
  }

  public unwrapSelection(): void {
    this.selection.unwrap();
  }

  public deleteSelection(): void {
    this.selection.deleteSelected();
  }

  public copySelection(): void {
    this.selection.copy();
  }

  public paste(): void {
    this.selection.paste();
  }

  public save(): void {
    this.saver.save();
  }

  public cancel(): void {
    this.saver.cancel();
  }

  public get root(): WritableSignal<Expression> {
    return this.document.root;
  }

  public get canUndo(): Signal<boolean> {
    return this.document.canUndo;
  }

  public get canRedo(): Signal<boolean> {
    return this.document.canRedo;
  }

  public get functions(): Signal<FormulaFunction[]> {
    return this.catalogue.functions;
  }

  public get catalogueState(): Signal<'loading' | 'ready' | 'failed'> {
    return this.catalogue.state;
  }

  public get columns(): DatasetColumn[] {
    return this.catalogue.columns;
  }

  public get scope(): Signal<FormulaScope> {
    return this.catalogue.scope;
  }

  public get loadError(): Signal<string | null> {
    return this.loader.loadError;
  }

  public get nameForm(): FieldTree<{ name: string }> {
    return this.columnForm.nameForm;
  }

  public get chosenType(): WritableSignal<DatasetColumnType | 'auto'> {
    return this.columnForm.chosenType;
  }

  public get resultType(): Signal<DatasetColumnType | null> {
    return this.saver.resultType;
  }

  public get serialized(): Signal<SerializedFormula> {
    return this.checking.serialized;
  }

  public get issues(): Signal<FormulaIssue[]> {
    return this.checking.issues;
  }

  public get blockIssues(): Signal<Map<number, FormulaIssue[]>> {
    return this.checking.blockIssues;
  }

  public get argumentIssues(): Signal<Map<string, FormulaIssue[]>> {
    return this.checking.argumentIssues;
  }

  public get resultKind(): Signal<FormulaValueKind> {
    return this.checking.resultKind;
  }

  public get preview(): Signal<FormulaPreview | null> {
    return this.checking.preview;
  }

  public get previewing(): Signal<boolean> {
    return this.checking.previewing;
  }

  public get previewFailed(): Signal<boolean> {
    return this.checking.previewFailed;
  }

  public get isValid(): Signal<boolean> {
    return this.checking.isValid;
  }

  public get dragging(): WritableSignal<DragPayload | null> {
    return this.interaction.dragging;
  }

  public get hovered(): WritableSignal<number | null> {
    return this.interaction.hovered;
  }

  public get dropPoint(): WritableSignal<DropPoint | null> {
    return this.interaction.dropPoint;
  }

  public get active(): WritableSignal<ExpressionAddress> {
    return this.interaction.active;
  }

  public get hint(): WritableSignal<string | null> {
    return this.interaction.hint;
  }

  public get flashed(): WritableSignal<number | null> {
    return this.interaction.flashed;
  }

  public get collapsed(): WritableSignal<ReadonlySet<number>> {
    return this.interaction.collapsed;
  }

  public get selectionRange(): Signal<SelectionRange | null> {
    return this.selection.range;
  }

  public get selectedIds(): Signal<Set<number>> {
    return this.selection.selectedIds;
  }

  public get clipboard(): Signal<readonly FormulaItem[]> {
    return this.selection.clipboard;
  }

  public get canUnwrap(): Signal<boolean> {
    return this.selection.canUnwrap;
  }

  public get saving(): Signal<boolean> {
    return this.saver.saving;
  }

  public get saveError(): Signal<string | null> {
    return this.saver.saveError;
  }
}
