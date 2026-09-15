import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import {
  DatasetColumn,
  DatasetColumnType,
  FormulaPreviewResult,
} from '../../../core/models/dataset';
import {
  FormulaBlock,
  FormulaOperator,
  columnBlock,
  deserializeFormula,
  functionBlock,
  numberBlock,
  operatorBlock,
  resolveColumnBlocks,
  serializeFormula,
  textBlock,
  boolBlock,
} from './formula-block.model';
import { FormulaFunctionSpec } from './formula-function-catalogue';
import { PaletteItem, createBlockFromPaletteItem } from './formula-palette-item';

export interface FormulaBuilderDialogData {
  datasetId: number;
  /** Every column in the dataset except the one being edited (a formula can't reference itself). */
  pickableColumns: DatasetColumn[];
  /** Present when editing an existing formula column; absent when adding a new one. */
  editingColumn?: DatasetColumn;
}

/** Where a canvas sits in the block tree: the top level, or one function block's argument slot —
 * `null` means the top level. Lets a recursive canvas commit an edit via one store method
 * ({@link FormulaBuilderStore.applyDrop}) regardless of how deep it is. */
export type CanvasPath = { functionId: string; slotIndex: number } | null;

/** What's currently being dragged — set on a native `dragstart`, read by whichever canvas ends up
 * owning the `drop` (innermost under the pointer, via `stopPropagation`), cleared on drop/dragend.
 * A plain in-memory reference rather than an HTML5 DataTransfer payload: everything happens within
 * this one document, so there's no need for DataTransfer's serialization/MIME-type handling. */
export type DragPayload =
  { kind: 'palette'; item: PaletteItem } | { kind: 'block'; block: FormulaBlock; from: CanvasPath };

/** What the live preview's request stream carries — null when there's nothing to preview yet. */
interface PreviewKey {
  resultType: DatasetColumnType;
  expression: string;
}

type PreviewState =
  | { state: 'empty' }
  | { state: 'loading' }
  | { state: 'ready'; result: FormulaPreviewResult }
  | { state: 'error'; message: string };

const RESULT_TYPES: { label: string; value: DatasetColumnType }[] = [
  { label: 'Decimal', value: 'double' },
  { label: 'Whole number', value: 'int' },
  { label: 'Text', value: 'string' },
  { label: 'Yes / No', value: 'bool' },
  { label: 'Date', value: 'dateTime' },
];

function pathsEqual(a: CanvasPath, b: CanvasPath): boolean {
  if (a === null || b === null) return a === b;
  return a.functionId === b.functionId && a.slotIndex === b.slotIndex;
}

/**
 * Owns the formula builder dialog's whole session: the block canvas (including the native
 * drag-and-drop state — see {@link DragPayload}), name/result-type fields, the debounced live
 * preview (mirrors the filter-builder's live match-count pattern), and saving. Component-provided
 * on {@link FormulaBuilderDialogComponent} so it reads the same {@link DIALOG_DATA} the component
 * does and can close the dialog itself on a successful save.
 */
@Injectable()
export class FormulaBuilderStore {
  public readonly data = inject<FormulaBuilderDialogData>(DIALOG_DATA);
  public readonly resultTypes = RESULT_TYPES;

  public readonly name = signal(this.data.editingColumn?.name ?? '');
  public readonly resultType = signal<DatasetColumnType>(this.data.editingColumn?.type ?? 'double');
  public readonly blocks = signal<FormulaBlock[]>([]);

  /** Set once, at startup, if the existing formula uses something the visual builder can't
   * represent (grouping parentheses) — the canvas starts empty and this explains why. */
  public readonly unrepresentable = signal<string | null>(null);

  public readonly saving = signal(false);
  public readonly saveError = signal<string | null>(null);

  /**
   * Native drag-and-drop state, shared across the palette and every (possibly nested) canvas
   * instance. `dragging` is what's being carried; `dragOverInstanceId` is which canvas's drop zone
   * currently owns the pointer — each canvas calls `stopPropagation()` in its own `dragover`
   * handler before claiming this, so only the innermost one under the pointer ever does, which is
   * what makes dropping into a nested function argument slot work rather than falling through to
   * the enclosing canvas.
   */
  public readonly dragging = signal<DragPayload | null>(null);
  public readonly dragOverInstanceId = signal<string | null>(null);
  public readonly dragOverIndex = signal(0);

  public readonly nameError = computed(() => {
    const trimmed = this.name().trim();
    if (!trimmed) return null;
    const taken = this.data.pickableColumns.some(
      (c) =>
        c.id !== this.data.editingColumn?.id &&
        c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    return taken ? `A column named "${trimmed}" already exists.` : null;
  });

  /**
   * The live evaluation of the formula-in-progress against a sample of the dataset's rows —
   * debounced and deduped exactly like the filter builder's live match count, but calling the
   * formula preview endpoint instead. Server-evaluated even during authoring, so there's exactly
   * one place a formula's meaning is ever decided. The request key is computed inline (rather than
   * as its own field) purely so this can stay declared among the public fields — it reads
   * `this.blocks`/`this.resultType`/`this.expression` lazily, inside the pipe, not at field-init
   * time, so it doesn't actually need those already assigned.
   */
  public readonly preview = toSignal(
    toObservable(
      computed<PreviewKey | null>(() => {
        if (this.blocks().length === 0) return null;
        return { resultType: this.resultType(), expression: this.expression() };
      }),
    ).pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap((key): Observable<PreviewState> =>
        key === null
          ? of<PreviewState>({ state: 'empty' })
          : this.api
              .previewFormula(
                this.data.datasetId,
                key.resultType,
                key.expression,
                this.data.editingColumn?.id,
              )
              .pipe(
                map((result): PreviewState =>
                  result.error
                    ? { state: 'error', message: result.error }
                    : { state: 'ready', result },
                ),
                startWith<PreviewState>({ state: 'loading' }),
                catchError(() =>
                  of<PreviewState>({ state: 'error', message: 'Could not evaluate this formula.' }),
                ),
              ),
      ),
    ),
    { initialValue: { state: 'empty' } as PreviewState },
  );

  private readonly api = inject(DatasetApiService);
  private readonly dialogRef = inject(DialogRef<DatasetColumn | undefined>);
  private readonly expression = computed(() => serializeFormula(this.blocks()));

  constructor() {
    const editing = this.data.editingColumn;
    if (editing?.formulaExpression) {
      try {
        const byName = new Map(this.data.pickableColumns.map((c) => [c.name.toLowerCase(), c.id]));
        this.blocks.set(resolveColumnBlocks(deserializeFormula(editing.formulaExpression), byName));
      } catch (err) {
        this.unrepresentable.set(
          err instanceof Error ? err.message : 'This formula could not be loaded.',
        );
      }
    }
  }

  // --- canvas editing (click-to-add fallback) ---------------------------------

  public addColumn(column: DatasetColumn): void {
    this.blocks.update((b) => [...b, columnBlock(column.id, column.name)]);
  }

  public addOperator(op: FormulaOperator): void {
    this.blocks.update((b) => [...b, operatorBlock(op)]);
  }

  public addNumber(): void {
    this.blocks.update((b) => [...b, numberBlock()]);
  }

  public addText(): void {
    this.blocks.update((b) => [...b, textBlock()]);
  }

  public addBool(): void {
    this.blocks.update((b) => [...b, boolBlock()]);
  }

  public addFunction(spec: FormulaFunctionSpec): void {
    this.blocks.update((b) => [...b, functionBlock(spec.name, spec.minArgs)]);
  }

  public removeBlock(id: string): void {
    this.blocks.set(removeBlockById(this.blocks(), id));
  }

  public updateLiteral(id: string, value: string | number | boolean): void {
    this.blocks.set(updateBlock(this.blocks(), id, value));
  }

  /** Adds one more (empty) argument slot to a variadic function block (MIN/MAX/CONCAT). */
  public addFunctionSlot(functionBlockId: string): void {
    this.blocks.set(
      mapBlock(this.blocks(), functionBlockId, (block) =>
        block.kind === 'function' ? { ...block, args: [...block.args, []] } : block,
      ),
    );
  }

  public removeFunctionSlot(functionBlockId: string, slotIndex: number): void {
    this.blocks.set(
      mapBlock(this.blocks(), functionBlockId, (block) =>
        block.kind === 'function'
          ? { ...block, args: block.args.filter((_, i) => i !== slotIndex) }
          : block,
      ),
    );
  }

  // --- native drag-and-drop ----------------------------------------------------

  public startDragFromPalette(item: PaletteItem): void {
    this.dragging.set({ kind: 'palette', item });
  }

  public startDragBlock(block: FormulaBlock, from: CanvasPath): void {
    this.dragging.set({ kind: 'block', block, from });
  }

  /** Claims the drag as being over `instanceId`'s canvas, at `index` within it. A canvas only
   * calls this after `stopPropagation()`, so calling it again for a nested canvas naturally
   * overwrites (and the outer canvas's own handler never runs to fight back). */
  public setDragOver(instanceId: string, index: number): void {
    this.dragOverInstanceId.set(instanceId);
    this.dragOverIndex.set(index);
  }

  /** Releases `instanceId`'s claim — a no-op if some other (e.g. nested) canvas already took over,
   * so a `dragleave` bubbling up from a child doesn't clear the child's own, still-current claim. */
  public clearDragOver(instanceId: string): void {
    if (this.dragOverInstanceId() === instanceId) this.dragOverInstanceId.set(null);
  }

  /**
   * Completes a drop into the canvas at `path`, at `index` within it: inserts a palette-sourced
   * block, or relocates/reorders an existing one. Rejects dropping a function (whether from the
   * palette or an existing block) into an argument slot — slots stay a flat sequence of
   * columns/literals/operators, never another function call; see `formula-block.model.ts`.
   */
  public completeDrop(path: CanvasPath, index: number): void {
    const payload = this.dragging();
    if (payload) {
      const isFunction =
        payload.kind === 'palette'
          ? payload.item.kind === 'function'
          : payload.block.kind === 'function';
      if (!(path !== null && isFunction)) {
        if (payload.kind === 'palette')
          this.insertBlock(path, index, createBlockFromPaletteItem(payload.item));
        else this.moveBlock(payload.block, payload.from, path, index);
      }
    }
    this.endDrag();
  }

  public endDrag(): void {
    this.dragging.set(null);
    this.dragOverInstanceId.set(null);
  }

  public save(): void {
    const name = this.name().trim();
    if (!name || this.nameError() || this.blocks().length === 0 || this.saving()) return;

    const payload = { name, resultType: this.resultType(), expression: this.expression() };
    this.saving.set(true);
    this.saveError.set(null);

    const request = this.data.editingColumn
      ? this.api.updateFormula(this.data.datasetId, this.data.editingColumn.id, payload)
      : this.api.addFormulaColumn(this.data.datasetId, payload);

    request.subscribe({
      next: (column) => {
        this.saving.set(false);
        this.dialogRef.close(column);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(
          typeof err.error === 'string' ? err.error : 'Something went wrong saving this formula.',
        );
      },
    });
  }

  public cancel(): void {
    this.dialogRef.close(undefined);
  }

  /** The block array at `path` right now — the top level, or one function's argument slot. */
  private getBlocksAt(path: CanvasPath): FormulaBlock[] {
    if (path === null) return this.blocks();
    const fn = findBlockById(this.blocks(), path.functionId);
    return fn?.kind === 'function' ? (fn.args[path.slotIndex] ?? []) : [];
  }

  /** Writes a freshly-edited block array back to wherever `path` points. */
  private setBlocksAt(path: CanvasPath, next: FormulaBlock[]): void {
    if (path === null) {
      this.blocks.set(next);
      return;
    }
    this.blocks.set(
      mapBlock(this.blocks(), path.functionId, (block) =>
        block.kind === 'function'
          ? { ...block, args: block.args.map((slot, i) => (i === path.slotIndex ? next : slot)) }
          : block,
      ),
    );
  }

  private insertBlock(path: CanvasPath, index: number, block: FormulaBlock): void {
    const next = [...this.getBlocksAt(path)];
    next.splice(index, 0, block);
    this.setBlocksAt(path, next);
  }

  /** Relocates an existing block — a reorder within the same list, or a move to a different one
   * (top level ↔ a slot, or between two slots). Removing then inserting, rather than one atomic
   * splice, is what naturally handles both: for a same-list reorder the index is adjusted for the
   * removal shifting everything after it. */
  private moveBlock(block: FormulaBlock, from: CanvasPath, to: CanvasPath, toIndex: number): void {
    const source = this.getBlocksAt(from);
    const fromIndex = source.findIndex((b) => b.id === block.id);
    if (fromIndex === -1) return;

    const sourceNext = source.filter((b) => b.id !== block.id);
    this.setBlocksAt(from, sourceNext);

    const sameList = pathsEqual(from, to);
    const destCurrent = sameList ? sourceNext : this.getBlocksAt(to);
    const adjustedIndex = sameList && toIndex > fromIndex ? toIndex - 1 : toIndex;
    const destNext = [...destCurrent];
    destNext.splice(adjustedIndex, 0, block);
    this.setBlocksAt(to, destNext);
  }
}

// --- pure block-tree helpers (recurse into function argument slots) ---------------------------

function removeBlockById(blocks: FormulaBlock[], id: string): FormulaBlock[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) =>
      b.kind === 'function' ? { ...b, args: b.args.map((slot) => removeBlockById(slot, id)) } : b,
    );
}

function mapBlock(
  blocks: FormulaBlock[],
  id: string,
  fn: (block: FormulaBlock) => FormulaBlock,
): FormulaBlock[] {
  return blocks.map((b) => {
    if (b.id === id) return fn(b);
    if (b.kind === 'function') return { ...b, args: b.args.map((slot) => mapBlock(slot, id, fn)) };
    return b;
  });
}

function updateBlock(
  blocks: FormulaBlock[],
  id: string,
  value: string | number | boolean,
): FormulaBlock[] {
  return mapBlock(blocks, id, (block) => {
    if (block.kind === 'number' && typeof value === 'number') return { ...block, value };
    if (block.kind === 'text' && typeof value === 'string') return { ...block, value };
    if (block.kind === 'bool' && typeof value === 'boolean') return { ...block, value };
    return block;
  });
}

function findBlockById(blocks: FormulaBlock[], id: string): FormulaBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.kind === 'function') {
      for (const slot of block.args) {
        const found = findBlockById(slot, id);
        if (found) return found;
      }
    }
  }
  return undefined;
}
