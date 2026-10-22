import { Component, computed, inject } from '@angular/core';
import { FormulaExpressionComponent } from '../formula-expression/formula-expression.component';
import { FormulaBuilderStore } from '../formula-builder.store';
import { FormulaSelectionBarComponent } from '../formula-selection-bar/formula-selection-bar.component';
import { FormulaItems } from '../model';

/** The root expression; empty, the whole area is a drop target. */
@Component({
  selector: 'app-formula-canvas',
  imports: [FormulaExpressionComponent, FormulaSelectionBarComponent],
  templateUrl: './formula-canvas.component.html',
  styleUrl: './formula-canvas.component.scss',
})
export class FormulaCanvasComponent {
  public readonly root = computed(() => this.store.root());
  public readonly address = FormulaItems.ROOT;

  private readonly store = inject(FormulaBuilderStore);
}
