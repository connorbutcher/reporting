import { Component, computed, inject, input, signal } from '@angular/core';
import { FormulaParameter } from '../../../../core/models/dataset';
import { FormulaBuilderStore } from '../formula-builder.store';
import {
  Expression,
  ExpressionAddress,
  FormulaIssue,
  FormulaItem,
  FunctionBlock,
  ValueKinds,
  FormulaChecker,
  Operators,
  FormulaParameters,
} from '../model';
import { ArgumentView } from './argument-view';
import { ArgumentViews } from './argument-views';
import { ResultBadge } from './result-badge';

/**
 * A row of formula items (the whole formula, an argument or a group), nested for functions and
 * groups. Items have no fixed operands; RPN works out what applies to what. Drops land between
 * items, claimed by the innermost expression under the pointer.
 */
@Component({
  selector: 'app-formula-expression',
  templateUrl: './formula-expression.component.html',
  styleUrl: './formula-expression.component.scss',
})
export class FormulaExpressionComponent {
  public readonly items = input.required<Expression>();
  public readonly address = input.required<ExpressionAddress>();
  public readonly hint = input('Drop here or type a value');
  public readonly large = input(false);

  public readonly badges = ValueKinds.BADGES;

  public readonly over = signal(false);

  public readonly armed = computed(
    () => this.store.dragging() !== null && this.store.canDropAt(this.address()),
  );

  public readonly isActive = computed(() => {
    const active = this.store.active();
    const mine = this.address();
    return active.ownerId === mine.ownerId && active.arg === mine.arg;
  });

  /** -1 when the drag isn't over this expression. */
  public readonly caret = computed(() => {
    const point = this.store.dropPoint();
    const mine = this.address();
    return point && point.address.ownerId === mine.ownerId && point.address.arg === mine.arg
      ? point.index
      : -1;
  });

  /** Item problems only; a whole argument's problems show on its row. */
  public readonly ownIssues = computed(() => {
    const ids = new Set(this.items().map((item) => item.id));
    return this.store
      .issues()
      .filter(
        (issue) => ids.has(issue.blockId) && issue.kind !== 'missing' && issue.arg === undefined,
      );
  });

  private readonly store = inject(FormulaBuilderStore);
  private readonly addresses = new Map<string, ExpressionAddress>();
  private readonly argumentViews = new WeakMap<FunctionBlock, ArgumentViews>();
  private readonly badgesByItem = new WeakMap<FormulaItem, ResultBadge>();

  /** Stable per argument so nested inputs don't change on every check. */
  public addressOf(ownerId: number, arg: number): ExpressionAddress {
    const key = `${ownerId}:${arg}`;
    let address = this.addresses.get(key);
    if (!address) {
      address = { ownerId, arg };
      this.addresses.set(key, address);
    }
    return address;
  }

  /** Cached per call so an unchanged call allocates nothing. */
  public argumentsOf(call: FunctionBlock): ArgumentView[] {
    const scope = this.store.scope();
    const argumentIssues = this.store.argumentIssues();

    const cached = this.argumentViews.get(call);
    if (cached && cached.scope === scope && cached.issues === argumentIssues) {
      return cached.views;
    }

    const params = FormulaChecker.parametersOf(call, scope);
    const views: ArgumentView[] = [];
    for (let index = 0; index < call.args.length; index++) {
      const parameter = params.length ? FormulaParameters.forArgument(params, index) : null;
      views.push({
        index,
        expression: call.args[index],
        parameter,
        label: this.argumentLabel(parameter, params.length, index),
        issues: argumentIssues.get(`${call.id}:${index}`) ?? [],
        removable: !!parameter?.isVariadic && index >= params.length,
      });
    }

    this.argumentViews.set(call, { scope, issues: argumentIssues, views });
    return views;
  }

  public repeating(call: FunctionBlock): FormulaParameter | null {
    const last = FormulaChecker.parametersOf(call, this.store.scope()).at(-1);
    return last?.isVariadic ? last : null;
  }

  public resultBadge(item: FormulaItem): string {
    const scope = this.store.scope();
    const cached = this.badgesByItem.get(item);
    if (cached && cached.scope === scope) {
      return cached.badge;
    }

    const badge = this.badges[FormulaChecker.kindOf([item], scope)];
    this.badgesByItem.set(item, { scope, badge });
    return badge;
  }

  public columnBadge(name: string): string {
    const column = this.store.scope().columns.get(name.toLowerCase());
    return this.badges[column ? ValueKinds.ofColumnType(column.type) : 'any'];
  }

  public symbol(op: string): string {
    return Operators.symbol(op);
  }

  public isWord(op: string): boolean {
    return /^[A-Z]+$/.test(op);
  }

  public operatorName(op: string): string {
    const definition = Operators.definition(op);
    return definition ? `${definition.symbol}: ${definition.description}` : op;
  }

  public isBad(id: number): boolean {
    return this.store.blockIssues().has(id);
  }

  public isLinked(id: number): boolean {
    return this.store.hovered() === id;
  }

  public isSelected(id: number): boolean {
    return this.store.selectedIds().has(id);
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

  public activate(event: Event): void {
    if ((event.target as HTMLElement).closest('.expr') === event.currentTarget) {
      this.store.active.set(this.address());
      if (event.target === event.currentTarget) {
        this.store.clearSelection();
      }
    }
  }

  /** Shift extends the selection, Ctrl or Cmd toggles. */
  public select(event: MouseEvent, item: FormulaItem): void {
    if ((event.target as HTMLElement).closest('button, input')) {
      return;
    }
    this.store.select(
      item.id,
      event.shiftKey ? 'range' : event.ctrlKey || event.metaKey ? 'toggle' : 'single',
    );
  }

  public selectGroup(event: MouseEvent, item: FormulaItem): void {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.classList.contains('paren')) {
      this.select(event, item);
    }
  }

  public startDrag(event: DragEvent, item: FormulaItem): void {
    event.stopPropagation();
    event.dataTransfer?.setData('text/plain', String(item.id));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    // Deferred so the highlights aren't in the drag image.
    setTimeout(() => {
      this.store.dragging.set({ kind: 'block', id: item.id });
    });
  }

  public endDrag(): void {
    this.store.dragging.set(null);
    this.store.dropPoint.set(null);
    this.over.set(false);
  }

  public dragOver(event: DragEvent): void {
    if (!this.store.dragging()) {
      return;
    }
    event.stopPropagation();
    if (!this.store.canDropAt(this.address())) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.over.set(true);
    this.store.dropPoint.set({ address: this.address(), index: this.insertionIndex(event) });
  }

  public dragLeave(event: DragEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as HTMLElement).contains(next)) {
      return;
    }
    this.over.set(false);
    if (this.caret() >= 0) {
      this.store.dropPoint.set(null);
    }
  }

  public drop(event: DragEvent): void {
    if (!this.store.dragging()) {
      return;
    }
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
    if (this.store.hovered() === item.id) {
      this.store.hovered.set(null);
    }
  }

  public trackIssue(issue: FormulaIssue): string {
    return `${issue.kind}-${issue.blockId}-${issue.arg ?? 'x'}-${issue.message}`;
  }

  private argumentLabel(
    parameter: FormulaParameter | null,
    parameterCount: number,
    index: number,
  ): string {
    if (!parameter) {
      return `value ${index + 1}`;
    }

    return parameter.isVariadic
      ? `${parameter.name} ${index - parameterCount + 2}`
      : parameter.name;
  }

  private insertionIndex(event: DragEvent): number {
    const row = event.currentTarget as HTMLElement;
    const items = Array.from(row.children).filter((child) => child.hasAttribute('data-item'));
    for (let i = 0; i < items.length; i++) {
      const box = items[i].getBoundingClientRect();
      if (event.clientY < box.top) {
        return i;
      }
      if (event.clientY <= box.bottom && event.clientX < box.left + box.width / 2) {
        return i;
      }
    }
    return items.length;
  }
}
