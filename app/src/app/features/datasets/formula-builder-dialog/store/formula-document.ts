import { Injectable, computed, signal } from '@angular/core';
import { Expression } from '../model';

const HISTORY_LIMIT = 100;

/** The formula's root expression and its undo history. */
@Injectable()
export class FormulaDocument {
  /** The formula's root expression; changed only through {@link commit}, so every change lands in the undo history. */
  public readonly root = signal<Expression>([]);

  public readonly canUndo = computed(() => this.past().length > 0);
  public readonly canRedo = computed(() => this.future().length > 0);

  private readonly past = signal<Expression[]>([]);
  private readonly future = signal<Expression[]>([]);

  public commit(next: Expression): void {
    if (next === this.root()) {
      return;
    }

    this.past.update((past) => [...past.slice(-(HISTORY_LIMIT - 1)), this.root()]);
    this.future.set([]);
    this.root.set(next);
  }

  /** Sets the formula without making an undo step — for opening a saved one. */
  public load(root: Expression): void {
    this.root.set(root);
  }

  public undo(): void {
    const previous = this.past().at(-1);
    if (previous === undefined) {
      return;
    }

    this.future.update((future) => [this.root(), ...future]);
    this.past.update((past) => past.slice(0, -1));
    this.root.set(previous);
  }

  public redo(): void {
    const next = this.future().at(0);
    if (next === undefined) {
      return;
    }

    this.past.update((past) => [...past, this.root()]);
    this.future.update((future) => future.slice(1));
    this.root.set(next);
  }
}
