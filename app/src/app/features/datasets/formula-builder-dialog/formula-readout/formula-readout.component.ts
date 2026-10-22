import { Component, computed, inject } from '@angular/core';
import { FormulaBuilderStore } from '../formula-builder.store';
import { FormulaSegment } from '../model';

/** The saved text, indented and coloured. Hovering links text and blocks both ways. */
@Component({
  selector: 'app-formula-readout',
  templateUrl: './formula-readout.component.html',
  styleUrl: './formula-readout.component.scss',
})
export class FormulaReadoutComponent {
  public readonly segments = computed(() => this.store.serialized().segments);
  public readonly empty = computed(() => this.store.root().length === 0);
  public readonly loadError = computed(() => this.store.loadError());

  private readonly store = inject(FormulaBuilderStore);

  /** Blocks with a problem of their own, whose text is underlined. */
  private readonly badBlocks = computed(() => new Set(this.store.blockIssues().keys()));

  public isBad(segment: FormulaSegment): boolean {
    if (segment.style === 'missing') {
      return true;
    }
    return (
      segment.blockId !== null &&
      segment.style !== 'punctuation' &&
      this.badBlocks().has(segment.blockId)
    );
  }

  public isLinked(segment: FormulaSegment): boolean {
    return segment.blockId !== null && segment.blockId === this.store.hovered();
  }

  public hover(segment: FormulaSegment): void {
    if (segment.blockId !== null) {
      this.store.hovered.set(segment.blockId);
    }
  }

  public unhover(): void {
    this.store.hovered.set(null);
  }
}
