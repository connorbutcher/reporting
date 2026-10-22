import { Injectable, inject, signal } from '@angular/core';
import { ExpressionAddress, FormulaIssue, FormulaItems, ExpressionTree } from '../model';
import { DragPayload } from './drag-payload';
import { DropPoint } from './drop-point';
import { FormulaDocument } from './formula-document';

/** Transient display state: drag and drop, hover linking, where click-to-add goes, the hint, folded calls and the flash. */
@Injectable()
export class FormulaInteraction {
  private static readonly FLASH_DELAY_MS = 0;

  private static readonly FLASH_DURATION_MS = 1400;
  public readonly dragging = signal<DragPayload | null>(null);
  public readonly hovered = signal<number | null>(null);
  /** Where the drag in progress would land, for the insertion marker. */
  public readonly dropPoint = signal<DropPoint | null>(null);
  /** The expression that click-to-add puts things into: the last one worked in. */
  public readonly active = signal<ExpressionAddress>(FormulaItems.ROOT);
  /** A one-line nudge shown near the palette. */
  public readonly hint = signal<string | null>(null);
  /** A block id to draw attention to, after clicking its problem in the list. */
  public readonly flashed = signal<number | null>(null);
  /** Calls folded to `NAME(…)`; display state only. */
  public readonly collapsed = signal<ReadonlySet<number>>(new Set());

  private readonly document = inject(FormulaDocument);

  /** The expression click-to-add puts things into: the one last worked in, or the root when that has gone. */
  public activeAddress(): ExpressionAddress {
    const active = this.active();
    return ExpressionTree.expressionAt(this.document.root(), active) ? active : FormulaItems.ROOT;
  }

  public toggleCollapsed(id: number): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) {
        next.add(id);
      }

      return next;
    });
  }

  /** Draws attention to a problem's block — or, for a missing argument, the call that lacks it. */
  public flash(issue: FormulaIssue): void {
    this.flashed.set(null);
    setTimeout(() => {
      this.flashed.set(issue.blockId);
    }, FormulaInteraction.FLASH_DELAY_MS);
    setTimeout(() => {
      this.flashed.set(null);
    }, FormulaInteraction.FLASH_DURATION_MS);
  }
}
