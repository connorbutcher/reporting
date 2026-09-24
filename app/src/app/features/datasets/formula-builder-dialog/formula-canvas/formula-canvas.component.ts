import { Component, computed, inject } from '@angular/core';
import { FormulaExpressionComponent } from '../formula-expression/formula-expression.component';
import { FormulaBuilderStore } from '../formula-builder.store';
import { FormulaSelectionBarComponent } from '../formula-selection-bar/formula-selection-bar.component';
import { ROOT } from '../model/formula-block';

/**
 * The formula: one expression, laid out left to right. With nothing on it the whole area is a drop target;
 * from then on things go between the items already there, or inside a function's arguments or brackets.
 */
@Component({
  selector: 'app-formula-canvas',
  imports: [FormulaExpressionComponent, FormulaSelectionBarComponent],
  templateUrl: './formula-canvas.component.html',
  styleUrl: './formula-canvas.component.scss',
})
export class FormulaCanvasComponent {
  public readonly root = computed(() => this.store.root());
  public readonly address = ROOT;

  private readonly store = inject(FormulaBuilderStore);
}
