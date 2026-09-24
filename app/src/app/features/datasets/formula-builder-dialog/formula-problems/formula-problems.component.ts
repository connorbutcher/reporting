import { DOCUMENT } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormulaBuilderStore } from '../formula-builder.store';
import { FormulaIssue } from '../model/formula-checker';

/**
 * Every problem with the formula in one list. Each is also shown on the block that caused it; this is the
 * overview, and clicking one takes you to (and flashes) that block.
 */
@Component({
  selector: 'app-formula-problems',
  templateUrl: './formula-problems.component.html',
  styleUrl: './formula-problems.component.scss',
})
export class FormulaProblemsComponent {
  public readonly issues = computed(() => this.store.issues());
  public readonly saveError = computed(() => this.store.saveError());
  public readonly checking = computed(() => this.store.previewing());
  public readonly checkFailed = computed(() => this.store.previewFailed());

  public readonly hasFormula = computed(() => this.store.root().length > 0);
  public readonly complete = computed(() => this.store.serialized().complete);
  public readonly needsType = computed(
    () => this.store.root().length > 0 && this.store.chosenType() === 'auto' && this.store.resultType() === null && this.issues().length === 0,
  );

  private readonly store = inject(FormulaBuilderStore);
  private readonly document = inject(DOCUMENT);

  public show(issue: FormulaIssue): void {
    this.store.flash(issue);
    this.document
      .querySelector(`[data-block-id="${issue.blockId}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
