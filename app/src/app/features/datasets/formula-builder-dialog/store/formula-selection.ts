import { Injectable, computed, inject, signal } from '@angular/core';
import {
  FormulaItem,
  argumentForWrap,
  cloneItem,
  emptyArguments,
  expressionAt,
  findItem,
  functionBlock,
  groupBlock,
  insertItems,
  isSameAddress,
  kindOfExpression,
  locateSelection,
  removeItems,
  replaceItems,
  slotIsOptional,
  unwrapGroup,
} from '../model';
import { FormulaCatalogue } from './formula-catalogue';
import { FormulaDocument } from './formula-document';
import { FormulaInteraction } from './formula-interaction';
import { SelectMode } from './select-mode';

/** Which items are selected, and what can be done with them: wrap, unwrap, delete, copy and paste. */
@Injectable()
export class FormulaSelection {
  /** The ids of the selected items — all in one expression. Ids that have since gone are ignored (see {@link range}). */
  public readonly selection = signal<readonly number[]>([]);
  /** Copied items, held as they were; each paste makes fresh copies of them. */
  public readonly clipboard = signal<readonly FormulaItem[]>([]);

  /** The selection as it stands in the formula, or null when nothing (still) is selected. */
  public readonly range = computed(() => {
    const ids = this.selection();
    return ids.length > 0 ? locateSelection(this.document.root(), ids) : null;
  });

  public readonly selectedIds = computed(() => {
    const ids = new Set<number>();
    for (const item of this.range()?.items ?? []) {
      ids.add(item.id);
    }

    return ids;
  });

  /** The kind of value the selection makes, which decides which argument of a wrapping function it fills. */
  public readonly kind = computed(() => {
    const range = this.range();
    return range ? kindOfExpression(range.items, this.catalogue.scope()) : 'any';
  });

  /** A single group is selected, so its brackets can be dissolved. */
  public readonly canUnwrap = computed(() => {
    const range = this.range();
    return range?.items.length === 1 && range.items[0].kind === 'group';
  });

  private readonly document = inject(FormulaDocument);
  private readonly catalogue = inject(FormulaCatalogue);
  private readonly interaction = inject(FormulaInteraction);
  private anchor: number | null = null;

  /**
   * Selects an item: on its own, extended from the last one clicked to this one (a range, within one
   * expression), or added to / taken out of the selection. A selection never spans expressions — selecting
   * in another one starts again.
   */
  public select(id: number, mode: SelectMode): void {
    if (!findItem(this.document.root(), id)) {
      return;
    }

    if (mode === 'range' && this.selectRange(id)) {
      return;
    }

    if (mode === 'toggle' && this.toggle(id)) {
      return;
    }

    this.selectOnly({ id });
  }

  public clearSelection(): void {
    this.selection.set([]);
    this.anchor = null;
  }

  /** Puts the selected items in brackets, so they are worked out first and count as one value. */
  public wrapInBrackets(): void {
    const range = this.range();
    if (!range?.contiguous) {
      return;
    }

    const group = groupBlock(range.items);
    this.document.commit(replaceItems(this.document.root(), range.address, range.start, range.items.length, [group]));
    this.selectOnly(group);
    this.interaction.active.set(range.address);
  }

  /** Makes the selected items an argument of a function — the first that takes what they produce — and leaves the others to fill. */
  public wrapInFunction(name: string): void {
    const range = this.range();
    const fn = this.catalogue.scope().functions.get(name.toUpperCase());
    if (!range?.contiguous || !fn) {
      return;
    }

    const args = emptyArguments(fn);
    args[argumentForWrap(fn, this.kind())] = range.items;
    const wrapper = functionBlock(fn, fn.name, args);
    this.document.commit(replaceItems(this.document.root(), range.address, range.start, range.items.length, [wrapper]));
    this.selectOnly(wrapper);

    // Carry on in the first argument that still needs something.
    const next = args.findIndex((arg, index) => arg.length === 0 && !slotIsOptional(fn.parameters, index));
    this.interaction.active.set(next >= 0 ? { ownerId: wrapper.id, arg: next } : range.address);
  }

  /** Dissolves the selected group, leaving what was inside it. */
  public unwrap(): void {
    const group = this.range()?.items[0];
    if (group?.kind !== 'group') {
      return;
    }

    this.document.commit(unwrapGroup(this.document.root(), group.id));
    this.selection.set(group.body.map((item) => item.id));
    this.anchor = group.body[0]?.id ?? null;
  }

  public deleteSelected(): void {
    const range = this.range();
    if (!range) {
      return;
    }

    this.document.commit(
      removeItems(
        this.document.root(),
        range.items.map((item) => item.id),
      ),
    );
    this.clearSelection();
  }

  public copy(): void {
    const range = this.range();
    if (!range) {
      return;
    }

    this.clipboard.set(range.items);
    const count = range.items.length;
    this.interaction.hint.set(
      `Copied ${count} item${count === 1 ? '' : 's'}. Paste puts a copy after the selection, or at the end of the row you last used.`,
    );
  }

  /** Puts a copy of the clipboard after the selection, or at the end of the expression last worked in, and selects it. */
  public paste(): void {
    const items = this.clipboard().map(cloneItem);
    if (items.length === 0) {
      return;
    }

    this.interaction.hint.set(null);

    const range = this.range();
    const address = range ? range.address : this.interaction.activeAddress();
    const expression = expressionAt(this.document.root(), address) ?? [];
    const index = range ? range.start + range.items.length : expression.length;

    this.document.commit(insertItems(this.document.root(), address, index, items));
    this.selection.set(items.map((item) => item.id));
    this.anchor = items[0].id;
    this.interaction.active.set(address);
  }

  /** Extends the selection from the anchor to `id`, when both are in one expression. */
  private selectRange(id: number): boolean {
    const root = this.document.root();
    const found = findItem(root, id);
    const anchor = this.anchor === null ? null : findItem(root, this.anchor);
    const expression = found ? expressionAt(root, found.address) : null;
    if (!found || !anchor || !expression || !isSameAddress(anchor.address, found.address)) {
      return false;
    }

    const from = Math.min(anchor.index, found.index);
    const to = Math.max(anchor.index, found.index);
    this.selection.set(expression.slice(from, to + 1).map((item) => item.id));
    return true;
  }

  /** Adds `id` to the selection, or takes it out, when the selection is in the same expression. */
  private toggle(id: number): boolean {
    const found = findItem(this.document.root(), id);
    const current = this.range();
    if (!found || !current || !isSameAddress(current.address, found.address)) {
      return false;
    }

    const expression = expressionAt(this.document.root(), found.address) ?? [];
    const ids = new Set(current.items.map((item) => item.id));
    if (!ids.delete(id)) {
      ids.add(id);
    }

    this.selection.set(expression.filter((item) => ids.has(item.id)).map((item) => item.id));
    this.anchor = id;
    return true;
  }

  private selectOnly(item: { id: number }): void {
    this.selection.set([item.id]);
    this.anchor = item.id;
  }
}
