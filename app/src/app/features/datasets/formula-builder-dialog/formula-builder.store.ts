import { HttpErrorResponse } from '@angular/common/http';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, required, validate } from '@angular/forms/signals';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { FormulaApiService } from '../../../core/api/formula-api.service';
import {
  DatasetColumn,
  DatasetColumnType,
  FormulaFunction,
  FormulaPreview,
} from '../../../core/models/dataset';
import { NotificationService } from '../../../core/services/notification.service';
import {
  Expression,
  ExpressionAddress,
  FormulaItem,
  LiteralBlock,
  OPERATORS,
  ROOT,
  argumentForWrap,
  cloneItem,
  columnBlock,
  emptyArguments,
  functionBlock,
  groupBlock,
  literalBlock,
  naturalColumnType,
  operatorItem,
  parameterFor,
  slotIsOptional,
} from './model/formula-block';
import { FormulaIssue, analyzeFormula, kindOfExpression, parametersOf, scopeOf } from './model/formula-checker';
import { FormulaParseError, parseFormula } from './model/formula-parser';
import { blockAtPosition, serializeFormula } from './model/formula-serializer';
import {
  addArgument,
  containsItem,
  expressionAt,
  findItem,
  insertItem,
  insertItems,
  locateSelection,
  removeArgument,
  removeItem,
  removeItems,
  replaceItems,
  unwrapGroup,
  updateItem,
} from './model/formula-tree';

export interface FormulaBuilderData {
  datasetId: number;
  /** Every column of the dataset — the ones a formula may read (bar the one being edited). */
  columns: DatasetColumn[];
  /** The formula column being edited; null when adding one. */
  column: DatasetColumn | null;
}

/** What is being dragged: something from the palette (which becomes a new item on drop) or an item already on the canvas. */
export type DragPayload =
  | { kind: 'column'; name: string }
  | { kind: 'function'; name: string }
  | { kind: 'operator'; op: string }
  | { kind: 'literal'; value: LiteralBlock['value'] }
  | { kind: 'group' }
  | { kind: 'block'; id: number };

/** Where the drag in progress would land: an expression, and the place in it. */
export interface DropPoint {
  address: ExpressionAddress;
  index: number;
}

const HISTORY_LIMIT = 100;
const PREVIEW_ROWS = 5;

/**
 * State for the formula builder dialog: the block tree, its undo history, the palette's catalogue, the
 * checks that run as the formula changes (locally for structure and types; on the server, debounced, for
 * the authoritative verdict and a preview of the results), and saving. Provided on the dialog, so the
 * palette, canvas, readout and preview all share it.
 */
@Injectable()
export class FormulaBuilderStore {
  public readonly data = inject<FormulaBuilderData>(DIALOG_DATA);

  // --- the formula --------------------------------------------------------------
  /** The formula's root expression; changed only through the store's commands, so every change lands in the undo history. */
  public readonly root = signal<Expression>([]);

  public readonly canUndo = computed(() => this.past().length > 0);
  public readonly canRedo = computed(() => this.future().length > 0);

  /** Calls folded to `NAME(…)`; display state only. */
  public readonly collapsed = signal<ReadonlySet<number>>(new Set());

  // --- catalogue ----------------------------------------------------------------
  public readonly functions = signal<FormulaFunction[]>([]);
  public readonly catalogueState = signal<'loading' | 'ready' | 'failed'>('loading');

  /** The columns a formula may read: all of the dataset's, except the one being defined. */
  public readonly columns = this.data.columns.filter((c) => c.id !== this.data.column?.id);

  public readonly scope = computed(() => scopeOf(this.functions(), this.columns));

  // --- name and type ------------------------------------------------------------
  public readonly nameForm = form(signal({ name: this.data.column?.name ?? '' }), (path) => {
    required(path.name, { message: 'A column name is required.' });
    validate(path.name, ({ value }) => {
      const name = value().trim();
      if (/[[\]]/.test(name)) return { kind: 'brackets', message: "A name can't contain [ or ], so formulas couldn't refer to it." };
      const taken = this.data.columns.some((c) => c.id !== this.data.column?.id && c.name.toLowerCase() === name.toLowerCase());
      return taken ? { kind: 'duplicate', message: `A column named "${name}" already exists.` } : null;
    });
  });

  /** The column type chosen by the user, or 'auto' to take the type the formula produces. */
  public readonly chosenType = signal<DatasetColumnType | 'auto'>('auto');

  // --- checking -----------------------------------------------------------------
  public readonly serialized = computed(() =>
    serializeFormula(this.root(), (call, index) => {
      const params = parametersOf(call, this.scope());
      return params.length
        ? { name: parameterFor(params, index).name, optional: slotIsOptional(params, index) }
        : { name: 'value', optional: false };
    }),
  );

  /** What can be told without the server: the kind the formula produces, and the problems in how it fits together. */
  public readonly analysis = computed(() => analyzeFormula(this.root(), this.scope()));

  public readonly localIssues = computed(() => this.analysis().issues);

  public readonly preview = signal<FormulaPreview | null>(null);
  public readonly previewing = signal(false);
  public readonly previewFailed = signal(false);

  /** Every problem with the formula: the local ones, or — once those are cleared — the server's. */
  public readonly issues = computed(() => [...this.localIssues(), ...this.serverIssues()]);

  /** Each item's own problems, by item id — for marking it, and listing them under its expression. */
  public readonly blockIssues = computed(() => {
    const byBlock = new Map<number, FormulaIssue[]>();
    for (const issue of this.issues()) {
      if (issue.kind === 'missing') continue;
      byBlock.set(issue.blockId, [...(byBlock.get(issue.blockId) ?? []), issue]);
    }
    return byBlock;
  });

  /** Problems with a function's argument as a whole (empty, or the wrong kind), keyed `functionId:argIndex`. */
  public readonly argumentIssues = computed(() => {
    const byArgument = new Map<string, FormulaIssue[]>();
    for (const issue of this.issues()) {
      if (issue.ownerId === undefined || issue.arg === undefined) continue;
      const key = `${issue.ownerId}:${issue.arg}`;
      byArgument.set(key, [...(byArgument.get(key) ?? []), issue]);
    }
    return byArgument;
  });

  /** The kind of value the formula produces; `any` when it can't be told or there is no formula. */
  public readonly resultKind = computed(() => this.analysis().kind);

  /** The column type the result will be stored as, or null when it must still be chosen. */
  public readonly resultType = computed<DatasetColumnType | null>(() => {
    const chosen = this.chosenType();
    return chosen === 'auto' ? naturalColumnType(this.resultKind()) : chosen;
  });

  /** True when the formula is complete and the server has passed it. */
  public readonly isValid = computed(
    () => this.root().length > 0 && this.issues().length === 0 && this.preview()?.isValid === true,
  );

  // --- drag and drop, and hover linking ------------------------------------------
  public readonly dragging = signal<DragPayload | null>(null);
  public readonly hovered = signal<number | null>(null);
  /** Where the drag in progress would land, for the insertion marker. */
  public readonly dropPoint = signal<DropPoint | null>(null);
  /** The expression that click-to-add puts things into: the last one worked in. */
  public readonly active = signal<ExpressionAddress>(ROOT);

  // --- selection and clipboard ---------------------------------------------------
  /** The ids of the selected items — all in one expression. Ids that have since gone are ignored (see {@link selectionRange}). */
  public readonly selection = signal<readonly number[]>([]);
  /** Copied items, held as they were; each paste makes fresh copies of them. */
  public readonly clipboard = signal<readonly FormulaItem[]>([]);

  /** The selection as it stands in the formula, or null when nothing (still) is selected. */
  public readonly selectionRange = computed(() => {
    const ids = this.selection();
    return ids.length > 0 ? locateSelection(this.root(), ids) : null;
  });

  public readonly selectedIds = computed(() => new Set(this.selectionRange()?.items.map((item) => item.id) ?? []));

  /** The kind of value the selection makes, which decides which argument of a wrapping function it fills. */
  public readonly selectionKind = computed(() => {
    const range = this.selectionRange();
    return range ? kindOfExpression(range.items, this.scope()) : 'any';
  });

  /** A single group is selected, so its brackets can be dissolved. */
  public readonly canUnwrap = computed(() => {
    const range = this.selectionRange();
    return range?.items.length === 1 && range.items[0].kind === 'group';
  });
  /** A one-line nudge shown near the palette. */
  public readonly hint = signal<string | null>(null);
  /** A block id to draw attention to, after clicking its problem in the list. */
  public readonly flashed = signal<number | null>(null);

  // --- saving -------------------------------------------------------------------
  public readonly saving = signal(false);
  public readonly saveError = signal<string | null>(null);
  /** Set when a saved formula couldn't be read back into blocks. */
  public readonly loadError = signal<string | null>(null);

  private readonly past = signal<Expression[]>([]);
  private readonly future = signal<Expression[]>([]);
  private readonly serverIssues = signal<FormulaIssue[]>([]);
  private readonly api = inject(FormulaApiService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject<DialogRef<DatasetColumn | undefined>>(DialogRef);
  private anchor: number | null = null;
  private readonly previewRequests = new Subject<{ text: string; type: DatasetColumnType | null } | null>();

  constructor() {
    this.api.functions().subscribe({
      next: (functions) => {
        this.functions.set(functions);
        this.catalogueState.set('ready');
        this.loadExisting();
      },
      error: () => this.catalogueState.set('failed'),
    });

    // Ask the server only about a formula that is complete and locally sound; anything else has nothing for it to add.
    effect(() => {
      const serialized = this.serialized();
      const runnable = this.root().length > 0 && serialized.complete && this.localIssues().length === 0;
      const type = this.chosenType() === 'auto' ? null : (this.chosenType() as DatasetColumnType);
      this.previewing.set(runnable);
      this.previewRequests.next(runnable ? { text: serialized.text, type } : null);
    });

    this.previewRequests
      .pipe(
        debounceTime(300),
        switchMap((request) =>
          request === null
            ? of({ request, preview: null as FormulaPreview | null, failed: false })
            : this.api
                .preview(this.data.datasetId, { expression: request.text, type: request.type, sampleSize: PREVIEW_ROWS })
                .pipe(
                  map((preview) => ({ request, preview: preview as FormulaPreview | null, failed: false })),
                  catchError(() => of({ request, preview: null as FormulaPreview | null, failed: true })),
                ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ request, preview, failed }) => {
        // A newer edit has already superseded this answer.
        if (request && request.text !== this.serialized().text) return;

        this.previewing.set(false);
        this.previewFailed.set(failed);
        this.preview.set(preview);
        this.serverIssues.set(preview && !preview.isValid ? this.placeServerErrors(preview) : []);
      });
  }

  // --- palette and canvas commands ------------------------------------------------

  /** Builds the item a palette drag or click stands for. */
  public itemFor(payload: Exclude<DragPayload, { kind: 'block' }>): FormulaItem {
    switch (payload.kind) {
      case 'column':
        return columnBlock(payload.name);
      case 'function':
        return functionBlock(this.scope().functions.get(payload.name.toUpperCase()), payload.name);
      case 'operator':
        return operatorItem(payload.op);
      case 'literal':
        return literalBlock(payload.value);
      case 'group':
        return groupBlock();
    }
  }

  /** Whether the drag in progress may go into the expression at `address` — anything may, except into itself. */
  public canDropAt(address: ExpressionAddress): boolean {
    const payload = this.dragging();
    if (!payload) return false;
    if (payload.kind !== 'block') return true;

    const moved = findItem(this.root(), payload.id)?.item;
    return !!moved && (address.ownerId === null || !containsItem(moved, address.ownerId));
  }

  /** Drops the drag in progress into an expression, before the item at `index`. */
  public drop(address: ExpressionAddress, index: number): void {
    const payload = this.dragging();
    this.dragging.set(null);
    this.dropPoint.set(null);
    if (!payload) return;

    if (payload.kind !== 'block') {
      const item = this.itemFor(payload);
      this.commit(insertItem(this.root(), address, index, item));
      this.focusAfterAdding(item, address);
      return;
    }

    const found = findItem(this.root(), payload.id);
    if (!found) return;
    if (address.ownerId !== null && containsItem(found.item, address.ownerId)) return;

    // Moving within one expression: the removal shifts everything after it up by one.
    const sameExpression = found.address.ownerId === address.ownerId && found.address.arg === address.arg;
    const at = sameExpression && found.index < index ? index - 1 : index;
    this.commit(insertItem(removeItem(this.root(), payload.id), address, at, found.item));
    this.active.set(address);
  }

  /** Adds a palette item without dragging: at the end of the expression last worked in. */
  public add(payload: Exclude<DragPayload, { kind: 'block' }>): void {
    this.hint.set(null);
    const address = expressionAt(this.root(), this.active()) ? this.active() : ROOT;
    const expression = expressionAt(this.root(), address) ?? [];
    const item = this.itemFor(payload);
    this.commit(insertItem(this.root(), address, expression.length, item));
    this.focusAfterAdding(item, address);
  }

  /**
   * Adds typed text to the end of an expression. An operator symbol becomes that operator, a number a number,
   * text in quotes the text inside them; anything else is text, kept as typed — a separator like " - " is often the point.
   */
  public typeInto(address: ExpressionAddress, text: string): void {
    if (text === '') return;
    const expression = expressionAt(this.root(), address);
    if (!expression) return;

    const trimmed = text.trim();
    const operator = OPERATORS.find((o) => o.op === trimmed.toUpperCase() || o.symbol === trimmed);
    let item: FormulaItem;
    if (operator) item = operatorItem(operator.op);
    else if (/^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) item = literalBlock(Number(trimmed));
    else if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) item = literalBlock(trimmed.slice(1, -1));
    else item = literalBlock(text);

    this.commit(insertItem(this.root(), address, expression.length, item));
    this.active.set(address);
  }

  /** Edits a literal in place; text that reads as a number stays a number if it was one. */
  public setLiteral(id: number, text: string): void {
    const current = findItem(this.root(), id)?.item;
    if (current?.kind !== 'literal') return;

    const isNumber = text.trim() !== '' && !Number.isNaN(Number(text));
    const value = typeof current.value === 'number' || isNumber ? (isNumber ? Number(text) : text) : text;
    if (value === current.value) return;
    this.commit(updateItem(this.root(), id, (item) => ({ ...item, value }) as FormulaItem));
  }

  public remove(id: number): void {
    this.commit(removeItem(this.root(), id));
  }

  public addArgument(functionId: number): void {
    this.commit(addArgument(this.root(), functionId));
  }

  public removeArgument(functionId: number, index: number): void {
    this.commit(removeArgument(this.root(), functionId, index));
  }

  public clear(): void {
    if (this.root().length > 0) this.commit([]);
    this.active.set(ROOT);
    this.clearSelection();
  }

  // --- selection -----------------------------------------------------------------

  /**
   * Selects an item: on its own, extended from the last one clicked to this one (a range, within one
   * expression), or added to / taken out of the selection. A selection never spans expressions — selecting
   * in another one starts again.
   */
  public select(id: number, mode: 'single' | 'range' | 'toggle'): void {
    const found = findItem(this.root(), id);
    if (!found) return;

    const current = this.selectionRange();
    const sameExpression = (a: ExpressionAddress): boolean => a.ownerId === found.address.ownerId && a.arg === found.address.arg;

    if (mode === 'range' && this.anchor !== null) {
      const anchor = findItem(this.root(), this.anchor);
      const expression = expressionAt(this.root(), found.address);
      if (anchor && expression && sameExpression(anchor.address)) {
        const [from, to] = [Math.min(anchor.index, found.index), Math.max(anchor.index, found.index)];
        this.selection.set(expression.slice(from, to + 1).map((item) => item.id));
        return;
      }
    }

    if (mode === 'toggle' && current && sameExpression(current.address)) {
      const expression = expressionAt(this.root(), found.address) ?? [];
      const ids = new Set(current.items.map((item) => item.id));
      if (!ids.delete(id)) ids.add(id);
      this.selection.set(expression.filter((item) => ids.has(item.id)).map((item) => item.id));
      this.anchor = id;
      return;
    }

    this.selection.set([id]);
    this.anchor = id;
  }

  public clearSelection(): void {
    this.selection.set([]);
    this.anchor = null;
  }

  /** Puts the selected items in brackets, so they are worked out first and count as one value. */
  public wrapSelectionInBrackets(): void {
    const range = this.selectionRange();
    if (!range?.contiguous) return;

    const group = groupBlock(range.items);
    this.commit(replaceItems(this.root(), range.address, range.start, range.items.length, [group]));
    this.selectOnly(group);
    this.active.set(range.address);
  }

  /** Makes the selected items an argument of a function — the first that takes what they produce — and leaves the others to fill. */
  public wrapSelectionInFunction(name: string): void {
    const range = this.selectionRange();
    const fn = this.scope().functions.get(name.toUpperCase());
    if (!range?.contiguous || !fn) return;

    const args = emptyArguments(fn);
    args[argumentForWrap(fn, this.selectionKind())] = range.items;
    const wrapper = functionBlock(fn, fn.name, args);
    this.commit(replaceItems(this.root(), range.address, range.start, range.items.length, [wrapper]));
    this.selectOnly(wrapper);

    // Carry on in the first argument that still needs something.
    const next = args.findIndex((arg, i) => arg.length === 0 && !slotIsOptional(fn.parameters, i));
    this.active.set(next >= 0 ? { ownerId: wrapper.id, arg: next } : range.address);
  }

  /** Dissolves the selected group, leaving what was inside it. */
  public unwrapSelection(): void {
    const range = this.selectionRange();
    const group = range?.items[0];
    if (!range || group?.kind !== 'group') return;

    this.commit(unwrapGroup(this.root(), group.id));
    this.selection.set(group.body.map((item) => item.id));
    this.anchor = group.body[0]?.id ?? null;
  }

  public deleteSelection(): void {
    const range = this.selectionRange();
    if (!range) return;

    this.commit(removeItems(this.root(), range.items.map((item) => item.id)));
    this.clearSelection();
  }

  public copySelection(): void {
    const range = this.selectionRange();
    if (!range) return;

    this.clipboard.set(range.items);
    const count = range.items.length;
    this.hint.set(`Copied ${count} item${count === 1 ? '' : 's'}. Paste puts a copy after the selection, or at the end of the row you last used.`);
  }

  /** Puts a copy of the clipboard after the selection, or at the end of the expression last worked in, and selects it. */
  public paste(): void {
    const items = this.clipboard().map(cloneItem);
    if (items.length === 0) return;
    this.hint.set(null);

    const range = this.selectionRange();
    const address = range ? range.address : expressionAt(this.root(), this.active()) ? this.active() : ROOT;
    const expression = expressionAt(this.root(), address) ?? [];
    const index = range ? range.start + range.items.length : expression.length;

    this.commit(insertItems(this.root(), address, index, items));
    this.selection.set(items.map((item) => item.id));
    this.anchor = items[0].id;
    this.active.set(address);
  }

  public toggleCollapsed(id: number): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  public undo(): void {
    const previous = this.past().at(-1);
    if (previous === undefined) return;
    this.future.update((f) => [this.root(), ...f]);
    this.past.update((p) => p.slice(0, -1));
    this.root.set(previous);
  }

  public redo(): void {
    const next = this.future().at(0);
    if (next === undefined) return;
    this.past.update((p) => [...p, this.root()]);
    this.future.update((f) => f.slice(1));
    this.root.set(next);
  }

  /** Draws attention to a problem's block — or, for a missing argument, the call that lacks it. */
  public flash(issue: FormulaIssue): void {
    this.flashed.set(null);
    setTimeout(() => this.flashed.set(issue.blockId));
    setTimeout(() => this.flashed.set(null), 1400);
  }

  // --- saving ---------------------------------------------------------------------

  public save(): void {
    this.saveError.set(null);
    this.nameForm.name().markAsTouched();
    if (!this.nameForm().valid()) return;
    if (this.root().length === 0) {
      this.saveError.set('Add a formula first.');
      return;
    }
    const problems = this.issues().length;
    if (problems > 0 || !this.serialized().complete) {
      this.saveError.set(problems > 0 ? `Fix ${problems === 1 ? 'the problem' : `the ${problems} problems`} before saving.` : 'Fill in the empty slots before saving.');
      return;
    }
    if (this.previewing()) {
      this.saveError.set('Still checking the formula — try again in a moment.');
      return;
    }

    const body = {
      name: this.nameForm.name().value().trim(),
      expression: this.serialized().text,
      type: this.chosenType() === 'auto' ? null : (this.chosenType() as DatasetColumnType),
    };
    const request = this.data.column
      ? this.api.updateColumn(this.data.datasetId, this.data.column.id, body)
      : this.api.addColumn(this.data.datasetId, body);

    this.saving.set(true);
    request.subscribe({
      next: (column) => this.dialogRef.close(column),
      error: (err: unknown) => {
        this.saving.set(false);
        // The server explains a rejected formula in its response text; show that here, beside the formula.
        if (err instanceof HttpErrorResponse && err.status === 400 && typeof err.error === 'string' && err.error) {
          this.saveError.set(err.error);
        } else {
          this.notify.apiError(err, "Couldn't save the formula column. Please try again.");
        }
      },
    });
  }

  public cancel(): void {
    this.dialogRef.close(undefined);
  }

  // --- internals --------------------------------------------------------------------

  private commit(next: Expression): void {
    if (next === this.root()) return;
    this.past.update((p) => [...p.slice(-(HISTORY_LIMIT - 1)), this.root()]);
    this.future.set([]);
    this.root.set(next);
    this.saveError.set(null);
  }

  private selectOnly(item: FormulaItem): void {
    this.selection.set([item.id]);
    this.anchor = item.id;
  }

  /** After adding a function or brackets, work goes on inside them; otherwise it stays where it was. */
  private focusAfterAdding(item: FormulaItem, address: ExpressionAddress): void {
    this.active.set(item.kind === 'function' || item.kind === 'group' ? { ownerId: item.id, arg: 0 } : address);
  }

  /** Opens the column being edited: reads its saved formula back into blocks and takes its type. */
  private loadExisting(): void {
    const existing = this.data.column;
    if (!existing?.formula) return;

    try {
      this.root.set(parseFormula(existing.formula, this.scope().functions));
      this.active.set(ROOT);
    } catch (error) {
      this.loadError.set(error instanceof FormulaParseError ? error.message : 'The formula could not be read.');
      return;
    }
    this.chosenType.set(naturalColumnType(this.resultKind()) === existing.type ? 'auto' : existing.type);
  }

  /** Puts each server error on the innermost block whose text contains it. */
  private placeServerErrors(preview: FormulaPreview): FormulaIssue[] {
    const { spans } = this.serialized();
    const rootId = this.root()[0]?.id ?? 0;
    return preview.errors.map((error) => ({
      kind: 'server',
      blockId: blockAtPosition(spans, error.position) ?? rootId,
      slot: null,
      message: error.message,
    }));
  }
}
