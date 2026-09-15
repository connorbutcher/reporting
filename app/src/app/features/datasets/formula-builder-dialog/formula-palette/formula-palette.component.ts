import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatasetColumn } from '../../../../core/models/dataset';
import { FormulaOperator } from '../formula-block.model';
import { FormulaBuilderStore } from '../formula-builder.store';
import {
  FORMULA_FUNCTIONS,
  FORMULA_FUNCTION_CATEGORIES,
  FormulaFunctionSpec,
} from '../formula-function-catalogue';
import { PaletteItem } from '../formula-palette-item';

interface OperatorButton {
  op: FormulaOperator;
  label: string;
}

const ARITHMETIC_OPERATORS: OperatorButton[] = [
  { op: '+', label: '+' },
  { op: '-', label: '−' },
  { op: '*', label: '×' },
  { op: '/', label: '÷' },
];
const COMPARISON_OPERATORS: OperatorButton[] = [
  { op: '=', label: '=' },
  { op: '<>', label: '≠' },
  { op: '<', label: '<' },
  { op: '<=', label: '≤' },
  { op: '>', label: '>' },
  { op: '>=', label: '≥' },
];
const LOGICAL_OPERATORS: OperatorButton[] = [
  { op: 'AND', label: 'AND' },
  { op: 'OR', label: 'OR' },
  { op: 'NOT', label: 'NOT' },
];

/**
 * The drag source: dataset columns, whitelisted functions (grouped by category), operators, and
 * literal placeholders. Every entry is both draggable (native HTML5 DnD — see
 * `formula-canvas.component.ts` for why) onto a {@link FormulaCanvasComponent} and clickable
 * (appends to the top-level canvas) — drag is the primary interaction, click is a
 * keyboard/touch-friendly fallback for the same action.
 *
 * A single search box filters both columns and functions at once (by name, and for functions
 * also by their one-line description) — with ~25 whitelisted functions across four categories,
 * scanning the whole palette to find e.g. "the one that trims text" doesn't scale, so search is
 * the fast path and the grouped-by-category browse view is the fallback. Operators and value
 * placeholders aren't searchable — there are few enough of those to always show them.
 */
@Component({
  selector: 'app-formula-palette',
  imports: [FormsModule, InputTextModule],
  templateUrl: './formula-palette.component.html',
  styleUrl: './formula-palette.component.scss',
})
export class FormulaPaletteComponent {
  public readonly columns = input.required<DatasetColumn[]>();
  public readonly arithmeticOperators = ARITHMETIC_OPERATORS;
  public readonly comparisonOperators = COMPARISON_OPERATORS;
  public readonly logicalOperators = LOGICAL_OPERATORS;

  public readonly search = signal('');

  public readonly filteredColumns = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.columns();
    return this.columns().filter((c) => c.name.toLowerCase().includes(term));
  });

  public readonly functionsByCategory = computed(() => {
    const term = this.search().trim().toLowerCase();
    return FORMULA_FUNCTION_CATEGORIES.map((category) => ({
      category,
      functions: FORMULA_FUNCTIONS.filter(
        (f) =>
          f.category === category &&
          (!term || f.name.toLowerCase().includes(term) || f.description.toLowerCase().includes(term)),
      ),
    })).filter((group) => group.functions.length > 0);
  });

  /** Whether the search term matched nothing at all, so the template can show one empty state
   * instead of an oddly bare set of sections. */
  public readonly noMatches = computed(
    () => !!this.search().trim() && this.filteredColumns().length === 0 && this.functionsByCategory().length === 0,
  );

  private readonly store = inject(FormulaBuilderStore);

  public columnItem(column: DatasetColumn): PaletteItem {
    return { kind: 'column', column };
  }

  public functionItem(spec: FormulaFunctionSpec): PaletteItem {
    return { kind: 'function', spec };
  }

  public operatorItem(button: OperatorButton): PaletteItem {
    return { kind: 'operator', op: button.op, label: button.label };
  }

  public startDrag(event: DragEvent, item: PaletteItem): void {
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    this.store.startDragFromPalette(item);
  }

  public onDragEnd(): void {
    this.store.endDrag();
  }

  public addColumn(column: DatasetColumn): void {
    this.store.addColumn(column);
  }

  public addFunction(spec: FormulaFunctionSpec): void {
    this.store.addFunction(spec);
  }

  public addOperator(op: FormulaOperator): void {
    this.store.addOperator(op);
  }

  public addNumber(): void {
    this.store.addNumber();
  }

  public addText(): void {
    this.store.addText();
  }

  public addBool(): void {
    this.store.addBool();
  }
}
