import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Select, SelectModule } from 'primeng/select';
import { FormulaFunction } from '../../../../core/models/dataset';
import { FormulaBuilderStore } from '../formula-builder.store';

/**
 * What can be done with the items selected on the canvas: put them in brackets or make them an argument of
 * a function (each one step, so no retyping what is already there), take brackets off, copy, or delete. It
 * appears only while something is selected. Wrapping needs items that sit next to each other.
 */
@Component({
  selector: 'app-formula-selection-bar',
  imports: [FormsModule, ButtonModule, SelectModule],
  templateUrl: './formula-selection-bar.component.html',
  styleUrl: './formula-selection-bar.component.scss',
})
export class FormulaSelectionBarComponent {
  public readonly range = computed(() => this.store.selectionRange());
  public readonly count = computed(() => this.range()?.items.length ?? 0);
  public readonly contiguous = computed(() => this.range()?.contiguous ?? false);
  public readonly canUnwrap = computed(() => this.store.canUnwrap());

  /** The functions a selection can be wrapped in: any that takes an argument, by name. */
  public readonly functions = computed(() =>
    this.store
      .functions()
      .filter((f) => f.parameters.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  private readonly store = inject(FormulaBuilderStore);

  public wrapInBrackets(): void {
    this.store.wrapSelectionInBrackets();
  }

  public wrapIn(fn: FormulaFunction | null, select: Select): void {
    if (fn) this.store.wrapSelectionInFunction(fn.name);
    select.writeValue(null); // ready for the next one
  }

  public unwrap(): void {
    this.store.unwrapSelection();
  }

  public copy(): void {
    this.store.copySelection();
  }

  public remove(): void {
    this.store.deleteSelection();
  }

  public clear(): void {
    this.store.clearSelection();
  }
}
