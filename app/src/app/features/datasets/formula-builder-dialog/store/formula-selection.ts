import { Injectable, computed, inject, signal } from '@angular/core';
import {
  FormulaItem,
  ExpressionTree,
  ItemFactory,
  FormulaChecker,
  TreeEdits,
  FormulaParameters,
} from '../model';
import { FormulaCatalogue } from './formula-catalogue';
import { FormulaDocument } from './formula-document';
import { FormulaInteraction } from './formula-interaction';
import { SelectMode } from './select-mode';
import { Plural } from '../../../../shared/text/plural';

/** Which items are selected, and what can be done with them: wrap, unwrap, delete, copy and paste. */
@Injectable()
export class FormulaSelection {
  /** All in one expression; ids that have gone are ignored. */
  public readonly selection = signal<readonly number[]>([]);
  public readonly clipboard = signal<readonly FormulaItem[]>([]);

  public readonly range = computed(() => {
    const ids = this.selection();
    return ids.length > 0 ? ExpressionTree.locateSelection(this.document.root(), ids) : null;
  });

  public readonly selectedIds = computed(() => {
    const ids = new Set<number>();
    for (const item of this.range()?.items ?? []) {
      ids.add(item.id);
    }

    return ids;
  });

  /** Decides which argument of a wrapping function the selection fills. */
  public readonly kind = computed(() => {
    const range = this.range();
    return range ? FormulaChecker.kindOf(range.items, this.catalogue.scope()) : 'any';
  });

  public readonly canUnwrap = computed(() => {
    const range = this.range();
    return range?.items.length === 1 && range.items[0].kind === 'group';
  });

  private readonly document = inject(FormulaDocument);
  private readonly catalogue = inject(FormulaCatalogue);
  private readonly interaction = inject(FormulaInteraction);
  private anchor: number | null = null;

  /** Selects alone, as a range, or toggled. Selecting in another expression starts again. */
  public select(id: number, mode: SelectMode): void {
    if (!ExpressionTree.find(this.document.root(), id)) {
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

  public wrapInBrackets(): void {
    const range = this.range();
    if (!range?.contiguous) {
      return;
    }

    const group = ItemFactory.group(range.items);
    this.document.commit(
      TreeEdits.replaceItems(this.document.root(), range.address, range.start, range.items.length, [
        group,
      ]),
    );
    this.selectOnly(group);
    this.interaction.active.set(range.address);
  }

  /** Wraps the selection in the first argument of a function that accepts it. */
  public wrapInFunction(name: string): void {
    const range = this.range();
    const fn = this.catalogue.scope().functions.get(name.toUpperCase());
    if (!range?.contiguous || !fn) {
      return;
    }

    const args = ItemFactory.emptyArguments(fn);
    args[FormulaParameters.argumentForWrap(fn, this.kind())] = range.items;
    const wrapper = ItemFactory.function(fn, fn.name, args);
    this.document.commit(
      TreeEdits.replaceItems(this.document.root(), range.address, range.start, range.items.length, [
        wrapper,
      ]),
    );
    this.selectOnly(wrapper);

    const next = args.findIndex(
      (arg, index) => arg.length === 0 && !FormulaParameters.slotIsOptional(fn.parameters, index),
    );
    this.interaction.active.set(next >= 0 ? { ownerId: wrapper.id, arg: next } : range.address);
  }

  public unwrap(): void {
    const group = this.range()?.items[0];
    if (group?.kind !== 'group') {
      return;
    }

    this.document.commit(TreeEdits.unwrapGroup(this.document.root(), group.id));
    this.selection.set(group.body.map((item) => item.id));
    this.anchor = group.body[0]?.id ?? null;
  }

  public deleteSelected(): void {
    const range = this.range();
    if (!range) {
      return;
    }

    this.document.commit(
      TreeEdits.removeItems(
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
      `Copied ${Plural.count(count, 'item')}. Paste puts a copy after the selection, or at the end of the row you last used.`,
    );
  }

  /** Pastes after the selection, or at the end of the last expression, and selects the copy. */
  public paste(): void {
    const items = this.clipboard().map(ItemFactory.clone);
    if (items.length === 0) {
      return;
    }

    this.interaction.hint.set(null);

    const range = this.range();
    const address = range ? range.address : this.interaction.activeAddress();
    const expression = ExpressionTree.expressionAt(this.document.root(), address) ?? [];
    const index = range ? range.start + range.items.length : expression.length;

    this.document.commit(TreeEdits.insertItems(this.document.root(), address, index, items));
    this.selection.set(items.map((item) => item.id));
    this.anchor = items[0].id;
    this.interaction.active.set(address);
  }

  private selectRange(id: number): boolean {
    const root = this.document.root();
    const found = ExpressionTree.find(root, id);
    const anchor = this.anchor === null ? null : ExpressionTree.find(root, this.anchor);
    const expression = found ? ExpressionTree.expressionAt(root, found.address) : null;
    if (
      !found ||
      !anchor ||
      !expression ||
      !ExpressionTree.isSameAddress(anchor.address, found.address)
    ) {
      return false;
    }

    const from = Math.min(anchor.index, found.index);
    const to = Math.max(anchor.index, found.index);
    this.selection.set(expression.slice(from, to + 1).map((item) => item.id));
    return true;
  }

  private toggle(id: number): boolean {
    const found = ExpressionTree.find(this.document.root(), id);
    const current = this.range();
    if (!found || !current || !ExpressionTree.isSameAddress(current.address, found.address)) {
      return false;
    }

    const expression = ExpressionTree.expressionAt(this.document.root(), found.address) ?? [];
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
