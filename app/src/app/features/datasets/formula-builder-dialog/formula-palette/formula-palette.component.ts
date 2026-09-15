import { Component, inject, input } from '@angular/core';
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
 */
@Component({
  selector: 'app-formula-palette',
  imports: [],
  templateUrl: './formula-palette.component.html',
  styleUrl: './formula-palette.component.scss',
})
export class FormulaPaletteComponent {
  public readonly columns = input.required<DatasetColumn[]>();
  public readonly arithmeticOperators = ARITHMETIC_OPERATORS;
  public readonly comparisonOperators = COMPARISON_OPERATORS;
  public readonly logicalOperators = LOGICAL_OPERATORS;
  public readonly functionsByCategory = FORMULA_FUNCTION_CATEGORIES.map((category) => ({
    category,
    functions: FORMULA_FUNCTIONS.filter((f) => f.category === category),
  }));

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
