import { Component, computed, inject, signal } from '@angular/core';
import {
  DatasetColumn,
  FormulaFunction,
  FormulaFunctionCategory,
} from '../../../../core/models/dataset';
import { FormulaBuilderStore } from '../formula-builder.store';
import { PalettePayload } from '../store/palette-payload';
import { KIND_BADGES, KIND_LABELS, OPERATORS, OperatorDefinition, columnTypeKind } from '../model';

type PaletteItem = PalettePayload;

interface FunctionGroup {
  category: FormulaFunctionCategory;
  label: string;
  functions: FormulaFunction[];
}

const CATEGORY_ORDER: { category: FormulaFunctionCategory; label: string }[] = [
  { category: 'math', label: 'Math' },
  { category: 'text', label: 'Text' },
  { category: 'date', label: 'Date and time' },
  { category: 'logic', label: 'Logic' },
  { category: 'conversion', label: 'Conversion' },
];

const VALUES: { label: string; value: boolean | null }[] = [
  { label: 'true', value: true },
  { label: 'false', value: false },
  { label: 'blank', value: null },
];

/**
 * Everything that can go into a formula: the dataset's columns, a few fixed values, the operators and the
 * functions the server offers. Each chip can be dragged to a place in the formula, or clicked to add it to the
 * end of the expression last worked in — so the builder works without a mouse drag, too. Hovering (or
 * focusing) a chip explains it in the panel below.
 */
@Component({
  selector: 'app-formula-palette',
  templateUrl: './formula-palette.component.html',
  styleUrl: './formula-palette.component.scss',
})
export class FormulaPaletteComponent {
  public readonly search = signal('');
  public readonly badges = KIND_BADGES;
  public readonly values = VALUES;
  public readonly operators = OPERATORS;

  /** Explains the chip under the pointer or focus. */
  public readonly help = signal<{ title: string; text: string } | null>(null);

  public readonly hint = computed(() => this.store.hint());

  public readonly columns = computed(() => {
    const query = this.query();
    return this.store.columns.filter((c) => !query || c.name.toLowerCase().includes(query));
  });

  public readonly groups = computed<FunctionGroup[]>(() => {
    const query = this.query();
    const matching = this.store
      .functions()
      .filter((f) => !query || f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query));
    return CATEGORY_ORDER.map(({ category, label }) => ({
      category,
      label,
      functions: matching.filter((f) => f.category === category),
    })).filter((g) => g.functions.length > 0);
  });

  public readonly showValues = computed(() => !this.query());

  public readonly shownOperators = computed(() => {
    const query = this.query();
    return this.operators.filter((o) => !query || o.symbol.includes(query) || o.description.toLowerCase().includes(query));
  });

  public readonly catalogueState = computed(() => this.store.catalogueState());

  public readonly nothingFound = computed(
    () => this.columns().length === 0 && this.groups().length === 0 && this.shownOperators().length === 0,
  );

  private readonly store = inject(FormulaBuilderStore);
  private readonly query = computed(() => this.search().trim().toLowerCase());

  public onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  public startDrag(event: DragEvent, item: PaletteItem): void {
    event.dataTransfer?.setData('text/plain', 'formula-block');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copyMove';
    }
    // Set after the browser has taken its drag image, so the highlights don't appear in it.
    setTimeout(() => {
      this.store.dragging.set(item);
    });
  }

  public endDrag(): void {
    this.store.dragging.set(null);
    this.store.dropPoint.set(null);
  }

  public add(item: PaletteItem): void {
    this.store.add(item);
  }

  public columnBadge(column: DatasetColumn): string {
    return this.badges[columnTypeKind(column.type)];
  }

  public explainColumn(column: DatasetColumn): void {
    this.help.set({ title: `[${column.name}]`, text: `A column that holds ${KIND_LABELS[columnTypeKind(column.type)]}.` });
  }

  public explainFunction(fn: FormulaFunction): void {
    const signature = fn.parameters
      .map((p) => (p.isVariadic ? `${p.name}, …` : p.isOptional ? `[${p.name}]` : p.name))
      .join(', ');
    this.help.set({ title: `${fn.name}(${signature})`, text: `${fn.description} Example: ${fn.example}` });
  }

  public explainOperator(operator: OperatorDefinition): void {
    this.help.set({ title: operator.symbol, text: `${operator.description} Place it between the values it applies to.` });
  }

  public explainGroup(): void {
    this.help.set({ title: '( )', text: 'Brackets: what is inside is worked out first, and counts as one value. Add values and operators inside.' });
  }

  public explainValue(label: string): void {
    this.help.set({ title: label, text: 'A fixed value. To use a number or text, type it into the row where it should go.' });
  }

  public clearHelp(): void {
    this.help.set(null);
  }
}
