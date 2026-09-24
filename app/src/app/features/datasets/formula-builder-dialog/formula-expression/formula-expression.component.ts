import { Component, computed, inject, input, signal } from '@angular/core';
import { FormulaParameter } from '../../../../core/models/dataset';
import { FormulaBuilderStore } from '../formula-builder.store';
import {
  Expression,
  ExpressionAddress,
  FormulaItem,
  FunctionBlock,
  KIND_BADGES,
  columnTypeKind,
  operatorDefinition,
  operatorSymbol,
  parameterFor,
} from '../model/formula-block';
import { FormulaIssue, kindOfExpression, parametersOf } from '../model/formula-checker';

/** One argument of a function, prepared for the template. */
interface ArgumentView {
  index: number;
  expression: Expression;
  parameter: FormulaParameter | null;
  label: string;
  /** Problems with the argument as a whole: empty when it needs a value, or the wrong kind of value. */
  issues: FormulaIssue[];
  /** A repeating parameter's spare argument the user can take away again. */
  removable: boolean;
}

/**
 * An expression: the items of a formula, or of one function argument or bracket group, in the order the
 * user laid them out. Values and operator symbols are just items in a row — nothing belongs to an operator's
 * "left" or "right"; what is beside it is what it applies to. Functions and groups hold expressions of
 * their own, so this component nests inside itself.
 *
 * Items are dropped *between* others: the pointer picks a place in the row and a marker shows it. A drag
 * is claimed by the innermost expression under the pointer (native drag events bubble outward, so each
 * expression stops them), and reverse Polish notation later works out what applies to what.
 */
@Component({
  selector: 'app-formula-expression',
  templateUrl: './formula-expression.component.html',
  styleUrl: './formula-expression.component.scss',
})
export class FormulaExpressionComponent {
  public readonly items = input.required<Expression>();
  public readonly address = input.required<ExpressionAddress>();
  /** Placeholder for the typing box when the expression is empty. */
  public readonly hint = input('Drop here or type a value');
  /** The big empty-canvas treatment, for the formula's root. */
  public readonly large = input(false);

  public readonly badges = KIND_BADGES;

  /** Whether a drag is over this expression. */
  public readonly over = signal(false);

  /** Whether the drag in progress could land here, so every valid target can be lit while dragging. */
  public readonly armed = computed(() => this.store.dragging() !== null && this.store.canDropAt(this.address()));

  /** Whether click-to-add is currently putting things here. */
  public readonly isActive = computed(() => {
    const active = this.store.active();
    const mine = this.address();
    return active.ownerId === mine.ownerId && active.arg === mine.arg;
  });

  /** Where the insertion marker goes, or -1 when the drag isn't over this expression. */
  public readonly caret = computed(() => {
    const point = this.store.dropPoint();
    const mine = this.address();
    return point && point.address.ownerId === mine.ownerId && point.address.arg === mine.arg ? point.index : -1;
  });

  /** Problems with these items themselves — not with a function argument as a whole, which its row shows. */
  public readonly ownIssues = computed(() => {
    const ids = new Set(this.items().map((item) => item.id));
    return this.store.issues().filter((issue) => ids.has(issue.blockId) && issue.kind !== 'missing' && issue.arg === undefined);
  });

  private readonly store = inject(FormulaBuilderStore);
  private readonly addresses = new Map<string, ExpressionAddress>();

  /** A stable address object per function argument or group, so nested inputs don't see a "new" value on every check. */
  public addressOf(ownerId: number, arg: number): ExpressionAddress {
    const key = `${ownerId}:${arg}`;
    let address = this.addresses.get(key);
    if (!address) {
      address = { ownerId, arg };
      this.addresses.set(key, address);
    }
    return address;
  }

  public argumentsOf(call: FunctionBlock): ArgumentView[] {
    const params = parametersOf(call, this.store.scope());
    const argumentIssues = this.store.argumentIssues();
    return call.args.map((expression, index) => {
      const parameter = params.length ? parameterFor(params, index) : null;
      return {
        index,
        expression,
        parameter,
        label: parameter ? (parameter.isVariadic ? `${parameter.name} ${index - params.length + 2}` : parameter.name) : `value ${index + 1}`,
        issues: argumentIssues.get(`${call.id}:${index}`) ?? [],
        removable: !!parameter?.isVariadic && index >= params.length,
      };
    });
  }

  /** The repeating parameter a call ends in, so it offers an "add another" button. */
  public repeating(call: FunctionBlock): FormulaParameter | null {
    const last = parametersOf(call, this.store.scope()).at(-1);
    return last?.isVariadic ? last : null;
  }

  /** The kind of value an item produces, for a function's return badge. */
  public resultBadge(item: FormulaItem): string {
    return this.badges[kindOfExpression([item], this.store.scope())];
  }

  public columnBadge(name: string): string {
    const column = this.store.scope().columns.get(name.toLowerCase());
    return this.badges[column ? columnTypeKind(column.type) : 'any'];
  }

  public symbol(op: string): string {
    return operatorSymbol(op);
  }

  /** Words (AND, OR, NOT) read smaller than symbols. */
  public isWord(op: string): boolean {
    return /^[A-Z]+$/.test(op);
  }

  public operatorName(op: string): string {
    const definition = operatorDefinition(op);
    return definition ? `${definition.symbol}: ${definition.description}` : op;
  }

  public isBad(id: number): boolean {
    return this.store.blockIssues().has(id);
  }

  public isLinked(id: number): boolean {
    return this.store.hovered() === id;
  }

  public isFlashed(id: number): boolean {
    return this.store.flashed() === id;
  }

  public isCollapsed(id: number): boolean {
    return this.store.collapsed().has(id);
  }

  public literalText(item: FormulaItem): string {
    return item.kind === 'literal' && item.value !== null ? String(item.value) : '';
  }

  public literalWidth(item: FormulaItem): number {
    return Math.max(this.literalText(item).length, 3) + 1;
  }

  public isText(item: FormulaItem): boolean {
    return item.kind === 'literal' && typeof item.value === 'string';
  }

  public isBlank(item: FormulaItem): boolean {
    return item.kind === 'literal' && item.value === null;
  }

  public isBool(item: FormulaItem): boolean {
    return item.kind === 'literal' && typeof item.value === 'boolean';
  }

  public boolText(item: FormulaItem): string {
    return item.kind === 'literal' && item.value === true ? 'true' : 'false';
  }

  // --- pointer and drag -----------------------------------------------------------

  /** Makes this the expression click-to-add works in, when the click landed on it rather than on something nested. */
  public activate(event: Event): void {
    if ((event.target as HTMLElement).closest('.expr') === event.currentTarget) {
      this.store.active.set(this.address());
    }
  }

  public startDrag(event: DragEvent, item: FormulaItem): void {
    event.stopPropagation();
    event.dataTransfer?.setData('text/plain', String(item.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    // Set after the browser has taken its drag image, so the highlights don't end up in it.
    setTimeout(() => this.store.dragging.set({ kind: 'block', id: item.id }));
  }

  public endDrag(): void {
    this.store.dragging.set(null);
    this.store.dropPoint.set(null);
    this.over.set(false);
  }

  public dragOver(event: DragEvent): void {
    if (!this.store.dragging()) return;
    event.stopPropagation();
    if (!this.store.canDropAt(this.address())) {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.over.set(true);
    this.store.dropPoint.set({ address: this.address(), index: this.insertionIndex(event) });
  }

  public dragLeave(event: DragEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as HTMLElement).contains(next)) return;
    this.over.set(false);
    if (this.caret() >= 0) this.store.dropPoint.set(null);
  }

  public drop(event: DragEvent): void {
    if (!this.store.dragging()) return;
    event.stopPropagation();
    this.over.set(false);
    if (!this.store.canDropAt(this.address())) {
      this.store.dragging.set(null);
      this.store.dropPoint.set(null);
      return;
    }
    event.preventDefault();
    this.store.drop(this.address(), this.caret() >= 0 ? this.caret() : this.insertionIndex(event));
  }

  // --- typing and editing ---------------------------------------------------------

  public type(event: Event): void {
    const input = event.target as HTMLInputElement;
    const text = input.value;
    input.value = '';
    this.store.typeInto(this.address(), text);
  }

  public setLiteral(event: Event, item: FormulaItem): void {
    this.store.setLiteral(item.id, (event.target as HTMLInputElement).value);
  }

  public remove(item: FormulaItem): void {
    this.store.remove(item.id);
  }

  public toggle(item: FormulaItem): void {
    this.store.toggleCollapsed(item.id);
  }

  public addArgument(call: FunctionBlock): void {
    this.store.addArgument(call.id);
  }

  public removeArgument(call: FunctionBlock, view: ArgumentView): void {
    this.store.removeArgument(call.id, view.index);
  }

  public hover(event: Event, item: FormulaItem): void {
    event.stopPropagation();
    this.store.hovered.set(item.id);
  }

  public unhover(item: FormulaItem): void {
    if (this.store.hovered() === item.id) this.store.hovered.set(null);
  }

  public trackIssue(issue: FormulaIssue): string {
    return `${issue.kind}-${issue.blockId}-${issue.arg ?? 'x'}-${issue.message}`;
  }

  /**
   * Where in this row the pointer would drop: before the first item that is on a later row, or on this row
   * and past the pointer's midpoint; the end if there is none.
   */
  private insertionIndex(event: DragEvent): number {
    const row = event.currentTarget as HTMLElement;
    const items = Array.from(row.children).filter((child) => child.hasAttribute('data-item'));
    for (let i = 0; i < items.length; i++) {
      const box = items[i].getBoundingClientRect();
      if (event.clientY < box.top) return i;
      if (event.clientY <= box.bottom && event.clientX < box.left + box.width / 2) return i;
    }
    return items.length;
  }
}
