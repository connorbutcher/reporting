import { Component, computed, inject } from '@angular/core';
import { FormulaBuilderStore } from '../formula-builder.store';

/** The formula's results on the first few rows of the dataset — computed by the server, with nothing saved. */
@Component({
  selector: 'app-formula-preview',
  templateUrl: './formula-preview.component.html',
  styleUrl: './formula-preview.component.scss',
})
export class FormulaPreviewComponent {
  public readonly preview = computed(() => this.store.preview());
  public readonly checking = computed(() => this.store.previewing());
  public readonly columnName = computed(() => this.store.nameForm.name().value().trim() || 'Result');
  public readonly hasFormula = computed(() => this.store.root().length > 0);
  public readonly blocked = computed(() => this.store.issues().length > 0 || !this.store.serialized().complete);

  private readonly store = inject(FormulaBuilderStore);
}
