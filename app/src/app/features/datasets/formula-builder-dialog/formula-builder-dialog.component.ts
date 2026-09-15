import { Component, inject } from '@angular/core';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormulaCanvasComponent } from './formula-canvas/formula-canvas.component';
import { FormulaPaletteComponent } from './formula-palette/formula-palette.component';
import { FormulaBuilderDialogData, FormulaBuilderStore } from './formula-builder.store';

/**
 * Adds or edits a formula column: drag columns/functions/operators from the palette onto the
 * canvas to build the expression, watch the live preview evaluate it against real rows, then save.
 * A thin view over {@link FormulaBuilderStore}, which owns the block tree (including the native
 * drag-and-drop state shared with the palette and canvas — see `formula-canvas.component.ts` for
 * why it's native DnD rather than Angular CDK), the debounced preview, and saving.
 */
@Component({
  selector: 'app-formula-builder-dialog',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FormulaPaletteComponent,
    FormulaCanvasComponent,
  ],
  templateUrl: './formula-builder-dialog.component.html',
  styleUrl: './formula-builder-dialog.component.scss',
  providers: [FormulaBuilderStore],
})
export class FormulaBuilderDialogComponent {
  public readonly data = inject<FormulaBuilderDialogData>(DIALOG_DATA);
  public readonly store = inject(FormulaBuilderStore);

  public close(): void {
    this.store.cancel();
  }
}
