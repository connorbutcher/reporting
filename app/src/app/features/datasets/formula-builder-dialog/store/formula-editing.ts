import { Injectable, inject } from '@angular/core';
import {
  ExpressionAddress,
  FormulaItem,
  FormulaItems,
  ItemFactory,
  ExpressionTree,
  TreeEdits,
} from '../model';
import { DragPayload } from './drag-payload';
import { FormulaCatalogue } from './formula-catalogue';
import { FormulaDocument } from './formula-document';
import { FormulaInteraction } from './formula-interaction';
import { FormulaSelection } from './formula-selection';
import { PalettePayload } from './palette-payload';

/** The commands the palette and canvas issue: adding, dropping, moving, typing into and removing items. */
@Injectable()
export class FormulaEditing {
  private readonly document = inject(FormulaDocument);
  private readonly catalogue = inject(FormulaCatalogue);
  private readonly interaction = inject(FormulaInteraction);
  private readonly selection = inject(FormulaSelection);

  /** Builds the item a palette drag or click stands for. */
  public itemFor(payload: PalettePayload): FormulaItem {
    switch (payload.kind) {
      case 'column':
        return ItemFactory.column(payload.name);
      case 'function':
        return ItemFactory.function(
          this.catalogue.scope().functions.get(payload.name.toUpperCase()),
          payload.name,
        );
      case 'operator':
        return ItemFactory.operator(payload.op);
      case 'literal':
        return ItemFactory.literal(payload.value);
      case 'group':
        return ItemFactory.group();
    }
  }

  /** Whether the drag in progress may go into the expression at `address` — anything may, except into itself. */
  public canDropAt(address: ExpressionAddress): boolean {
    const payload: DragPayload | null = this.interaction.dragging();
    if (!payload) {
      return false;
    }

    if (payload.kind !== 'block') {
      return true;
    }

    const moved = ExpressionTree.find(this.document.root(), payload.id)?.item;
    return (
      !!moved && (address.ownerId === null || !ExpressionTree.contains(moved, address.ownerId))
    );
  }

  /** Drops the drag in progress into an expression, before the item at `index`. */
  public drop(address: ExpressionAddress, index: number): void {
    const payload = this.interaction.dragging();
    this.interaction.dragging.set(null);
    this.interaction.dropPoint.set(null);
    if (!payload) {
      return;
    }

    if (payload.kind === 'block') {
      this.moveInto(payload.id, address, index);
      return;
    }

    const item = this.itemFor(payload);
    this.document.commit(TreeEdits.insertItem(this.document.root(), address, index, item));
    this.focusAfterAdding(item, address);
  }

  /** Adds a palette item without dragging: at the end of the expression last worked in. */
  public add(payload: PalettePayload): void {
    this.interaction.hint.set(null);

    const address = this.interaction.activeAddress();
    const expression = ExpressionTree.expressionAt(this.document.root(), address) ?? [];
    const item = this.itemFor(payload);
    this.document.commit(
      TreeEdits.insertItem(this.document.root(), address, expression.length, item),
    );
    this.focusAfterAdding(item, address);
  }

  /** Adds typed text to the end of an expression (see {@link ItemFactory.fromText} for how it is read). */
  public typeInto(address: ExpressionAddress, text: string): void {
    const expression =
      text === '' ? null : ExpressionTree.expressionAt(this.document.root(), address);
    if (!expression) {
      return;
    }

    this.document.commit(
      TreeEdits.insertItem(
        this.document.root(),
        address,
        expression.length,
        ItemFactory.fromText(text),
      ),
    );
    this.interaction.active.set(address);
  }

  /** Edits a literal in place; text that reads as a number becomes a number. */
  public setLiteral(id: number, text: string): void {
    const current = ExpressionTree.find(this.document.root(), id)?.item;
    if (current?.kind !== 'literal') {
      return;
    }

    const value = ItemFactory.editedLiteralValue(text);
    if (value === current.value) {
      return;
    }

    this.document.commit(
      TreeEdits.updateItem(this.document.root(), id, (item) => ({ ...item, value }) as FormulaItem),
    );
  }

  public remove(id: number): void {
    this.document.commit(TreeEdits.removeItem(this.document.root(), id));
  }

  public addArgument(functionId: number): void {
    this.document.commit(TreeEdits.addArgument(this.document.root(), functionId));
  }

  public removeArgument(functionId: number, index: number): void {
    this.document.commit(TreeEdits.removeArgument(this.document.root(), functionId, index));
  }

  public clear(): void {
    if (this.document.root().length > 0) {
      this.document.commit([]);
    }

    this.interaction.active.set(FormulaItems.ROOT);
    this.selection.clearSelection();
  }

  /** Moves an item already on the canvas into another place — never into itself. */
  private moveInto(id: number, address: ExpressionAddress, index: number): void {
    const found = ExpressionTree.find(this.document.root(), id);
    if (
      !found ||
      (address.ownerId !== null && ExpressionTree.contains(found.item, address.ownerId))
    ) {
      return;
    }

    // Moving within one expression: the removal shifts everything after it up by one.
    const sameExpression =
      found.address.ownerId === address.ownerId && found.address.arg === address.arg;
    const at = sameExpression && found.index < index ? index - 1 : index;
    this.document.commit(
      TreeEdits.insertItem(TreeEdits.removeItem(this.document.root(), id), address, at, found.item),
    );
    this.interaction.active.set(address);
  }

  /** After adding a function or brackets, work goes on inside them; otherwise it stays where it was. */
  private focusAfterAdding(item: FormulaItem, address: ExpressionAddress): void {
    this.interaction.active.set(
      item.kind === 'function' || item.kind === 'group' ? { ownerId: item.id, arg: 0 } : address,
    );
  }
}
