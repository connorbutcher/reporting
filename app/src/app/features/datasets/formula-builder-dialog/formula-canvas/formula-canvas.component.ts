import { Component, ElementRef, inject, input, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormulaBlock } from '../formula-block.model';
import { CanvasPath, FormulaBuilderStore } from '../formula-builder.store';
import { setDragImageForBlock } from '../formula-drag-preview';
import { findFormulaFunction, formulaArgLabel } from '../formula-function-catalogue';

let nextInstanceId = 0;

/**
 * One flat sequence of formula blocks — the top-level canvas, or (recursively) one function
 * block's argument slot. Drag-and-drop is native HTML5 DnD, not Angular CDK: CDK's `cdkDropList`
 * hit-testing doesn't reliably resolve which of two *nested* drop lists (this canvas vs. an
 * ancestor canvas) should own a drop, so a drop meant for a function's argument slot kept landing
 * on the enclosing canvas instead. Native `dragover`/`drop` events bubble from the innermost
 * element outward, and each handler here calls `stopPropagation()` once it claims the drag — so
 * the innermost matching canvas always wins, which is exactly what nesting needs.
 *
 * Purely presentational otherwise: every edit calls straight through to {@link FormulaBuilderStore},
 * injected here rather than passed down, since the store is component-provided on the dialog and
 * every descendant (however deeply nested) shares the same instance. `path` tells this instance
 * which array to write back through when it owns a drop.
 */
@Component({
  selector: 'app-formula-canvas',
  imports: [
    FormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    // Self-imported: a function block recursively renders one canvas per argument slot.
    FormulaCanvasComponent,
  ],
  templateUrl: './formula-canvas.component.html',
  styleUrl: './formula-canvas.component.scss',
})
export class FormulaCanvasComponent {
  public readonly blocks = input.required<FormulaBlock[]>();
  public readonly path = input<CanvasPath>(null);
  public readonly placeholder = input('Drag a column, function or operator here');
  public readonly boolOptions = [
    { label: 'TRUE', value: true },
    { label: 'FALSE', value: false },
  ];

  private readonly store = inject(FormulaBuilderStore);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  /** The `.canvas` div itself — NOT the same node as `elementRef.nativeElement`, which is this
   * component's host (`<app-formula-canvas>`) and has exactly one direct child (this div); the
   * chip elements `computeInsertionIndex` needs are that div's children, one level further down. */
  private readonly canvasEl = viewChild.required<ElementRef<HTMLElement>>('canvasEl');
  /** Stable for this instance's lifetime — identifies it in the store's shared drag-over state
   * without relying on `path()`, which the parent re-creates as a new object every render. */
  private readonly instanceId = `formula-canvas-${++nextInstanceId}`;

  public isDropTarget(): boolean {
    return this.store.dragOverInstanceId() === this.instanceId;
  }

  /** This canvas is the one currently under the pointer, but what's being dragged can't actually
   * land here (a function over an argument slot) — shown as a distinct "won't fit" state rather
   * than the ordinary insertion preview, so the drop's rejection isn't a silent surprise. */
  public isDropInvalid(): boolean {
    return this.isDropTarget() && this.store.dragOverInvalid();
  }

  /** A drag is in progress and this canvas *could* accept it — used to give every valid drop zone
   * a gentle highlight for the duration of the drag, not just the one currently under the pointer,
   * so it's obvious at a glance where a block can be dropped before you get there. */
  public isDragReady(): boolean {
    const dragging = this.store.dragging();
    return dragging !== null && !this.store.wouldRejectDrop(this.path());
  }

  public dropIndex(): number {
    return this.store.dragOverIndex();
  }

  public onDragOver(event: DragEvent): void {
    if (!this.store.dragging()) return;
    event.preventDefault();
    event.stopPropagation();
    const invalid = this.store.wouldRejectDrop(this.path());
    if (event.dataTransfer) event.dataTransfer.dropEffect = invalid ? 'none' : 'move';
    this.store.setDragOver(
      this.instanceId,
      this.computeInsertionIndex(event.clientX, event.clientY),
      invalid,
    );
  }

  /** Fires when the pointer leaves this canvas's element *or any of its children* — including
   * moving onto a nested slot's own canvas — so it only releases this instance's claim, never a
   * descendant's (that descendant has already taken over via `stopPropagation` by then anyway;
   * this just avoids incorrectly clearing state a `dragleave` bubbling up shouldn't touch). */
  public onDragLeave(event: DragEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.elementRef.nativeElement.contains(related)) return;
    this.store.clearDragOver(this.instanceId);
  }

  public onDrop(event: DragEvent): void {
    if (!this.store.dragging()) return;
    event.preventDefault();
    event.stopPropagation();
    this.store.completeDrop(this.path(), this.dropIndex());
  }

  public startDrag(event: DragEvent, block: FormulaBlock): void {
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    // Commit the drag state before touching the DOM for the custom preview below — that way the
    // drag itself is fully armed even if the (purely cosmetic) preview throws in some browser.
    this.store.startDragBlock(block, this.path());
    setDragImageForBlock(event, block);
  }

  public onDragEnd(): void {
    this.store.endDrag();
  }

  /** Dims the chip being dragged at its origin, while a drop-preview copy effectively follows the
   * pointer via the browser's own native drag image — there's no separate "placeholder" element to
   * manage, unlike CDK. */
  public isDragging(block: FormulaBlock): boolean {
    const dragging = this.store.dragging();
    return dragging?.kind === 'block' && dragging.block.id === block.id;
  }

  public remove(id: string): void {
    this.store.removeBlock(id);
  }

  public setNumber(id: string, value: number | null): void {
    this.store.updateLiteral(id, value ?? 0);
  }

  public setText(id: string, value: string): void {
    this.store.updateLiteral(id, value);
  }

  public setBool(id: string, value: boolean): void {
    this.store.updateLiteral(id, value);
  }

  public addSlot(functionId: string): void {
    this.store.addFunctionSlot(functionId);
  }

  public removeSlot(functionId: string, index: number): void {
    this.store.removeFunctionSlot(functionId, index);
  }

  public slotPath(functionId: string, slotIndex: number): CanvasPath {
    return { functionId, slotIndex };
  }

  /** Whether this function can take another argument (per its catalogue arity), for the "+" button. */
  public canAddSlot(block: Extract<FormulaBlock, { kind: 'function' }>): boolean {
    const spec = findFormulaFunction(block.name);
    return spec === undefined || spec.maxArgs === null || block.args.length < spec.maxArgs;
  }

  /** Whether a slot can be removed without dropping below this function's minimum arity. */
  public canRemoveSlot(block: Extract<FormulaBlock, { kind: 'function' }>): boolean {
    const spec = findFormulaFunction(block.name);
    return block.args.length > (spec?.minArgs ?? 1);
  }

  /** The placeholder label for one of a function block's argument slots, e.g. "condition" for
   * IF's first slot — falls back to a generic "value" for a function the catalogue doesn't know
   * (a formula edited outside the builder shouldn't crash rendering). */
  public argLabel(block: Extract<FormulaBlock, { kind: 'function' }>, slotIndex: number): string {
    const spec = findFormulaFunction(block.name);
    return spec ? formulaArgLabel(spec, slotIndex) : 'value';
  }

  /** Whether a function block is folded down to `NAME(…)` — a large formula with several
   * multi-argument functions reads better when the ones you're not currently working on can be
   * tucked away instead of always showing every argument row. Purely a display toggle, kept in the
   * store (keyed by block id) so it's stable regardless of which canvas instance re-renders it. */
  public isFunctionCollapsed(id: string): boolean {
    return this.store.isFunctionCollapsed(id);
  }

  public toggleFunctionCollapsed(id: string): void {
    this.store.toggleFunctionCollapsed(id);
  }

  /** Which gap between this canvas's direct chip children the pointer is closest to, for both the
   * drop's insertion index and the visual indicator. A simple nearest-gap heuristic (compare
   * against each chip's own row, then its horizontal midpoint) rather than a general layout
   * solver — plenty for a short, mostly-single-row wrapping list of chips. */
  private computeInsertionIndex(clientX: number, clientY: number): number {
    const chips = Array.from(this.canvasEl().nativeElement.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('chip'),
    );
    for (let i = 0; i < chips.length; i++) {
      const rect = chips[i].getBoundingClientRect();
      if (clientY < rect.top) return i;
      const withinRow = clientY <= rect.bottom;
      if (withinRow && clientX < rect.left + rect.width / 2) return i;
    }
    return chips.length;
  }
}
