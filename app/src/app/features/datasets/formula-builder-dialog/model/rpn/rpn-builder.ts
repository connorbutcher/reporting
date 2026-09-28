import { FormulaItem } from '../items/formula-item';
import { OperandItem } from '../items/operand-item';
import { OperatorItem } from '../items/operator-item';
import { NEGATION_PRECEDENCE } from '../operators/negation-precedence';
import { canBePrefix, operatorDefinition, operatorSymbol } from '../operators/operator-lookup';
import { PendingOperator } from './pending-operator';
import { Rpn } from './rpn';
import { RpnIssue } from './rpn-issue';
import { RpnToken } from './rpn-token';

/**
 * The shunting-yard algorithm, one item at a time. It never stops at a mistake: a missing value becomes a
 * `missing` token and the problem is recorded, so the result is always well formed and the user is told
 * about every gap at once.
 */
export class RpnBuilder {
  private readonly output: RpnToken[] = [];
  private readonly issues: RpnIssue[] = [];
  private readonly stack: PendingOperator[] = [];
  private expectOperand = true;

  public build(expression: readonly FormulaItem[]): Rpn {
    for (const item of expression) {
      if (item.kind === 'operator') {
        this.addOperator(item);
      } else {
        this.addOperand(item);
      }
    }

    this.finish(expression);
    return { tokens: this.output, issues: this.issues };
  }

  private addOperand(item: OperandItem): void {
    if (!this.expectOperand) {
      this.issues.push({ blockId: item.id, message: 'Put an operator between this and the value before it.' });
    }

    this.output.push({ type: 'operand', item });
    this.expectOperand = false;
  }

  private addOperator(item: OperatorItem): void {
    const definition = operatorDefinition(item.op);
    const symbol = operatorSymbol(item.op);

    if (this.expectOperand) {
      if (canBePrefix(item.op)) {
        const precedence = item.op === 'NOT' ? (definition?.precedence ?? 3) : NEGATION_PRECEDENCE;
        this.stack.push({ item, unary: true, precedence });
        return;
      }

      this.issues.push({ blockId: item.id, message: `${symbol} needs a value on its left.` });
      this.output.push({ type: 'missing', operatorId: item.id });
    } else if (definition?.prefixOnly) {
      this.issues.push({ blockId: item.id, message: `${symbol} goes in front of a value, after AND, OR or an operator.` });
      this.stack.push({ item, unary: true, precedence: definition.precedence });
      this.expectOperand = true;
      return;
    }

    this.pushBinary(item, symbol);
  }

  private pushBinary(item: OperatorItem, symbol: string): void {
    const definition = operatorDefinition(item.op);
    const precedence = definition?.precedence ?? 0;
    const associativity = definition?.associativity ?? 'left';

    while (this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1];
      if (top.precedence === precedence && associativity === 'none' && !top.unary) {
        this.issues.push({ blockId: item.id, message: `${symbol} can't follow another comparison directly; combine them with AND or OR.` });
      }

      if (top.precedence > precedence || (top.precedence === precedence && associativity !== 'right')) {
        this.popOperator();
      } else {
        break;
      }
    }

    this.stack.push({ item, unary: false, precedence });
    this.expectOperand = true;
  }

  private finish(expression: readonly FormulaItem[]): void {
    if (this.expectOperand && expression.length > 0) {
      const last = expression[expression.length - 1];
      const symbol = last.kind === 'operator' ? operatorSymbol(last.op) : '';
      this.issues.push({ blockId: last.id, message: `${symbol} needs a value after it.` });
      this.output.push({ type: 'missing', operatorId: last.id });
    }

    while (this.stack.length > 0) {
      this.popOperator();
    }
  }

  private popOperator(): void {
    const top = this.stack.pop()!;
    this.output.push({ type: 'operator', item: top.item, unary: top.unary });
  }
}
