import { FormulaValueKind } from '../../../../../core/models/dataset';
import { ValueKinds } from '../kinds/value-kinds';
import { OperatorItem } from '../items/operator-item';
import { Operators } from '../operators/operators';
import { FormulaIssue } from './formula-issue';
import { TypedValue } from './typed-value';

/** Checks the operands of an operator against what it takes, and gives the kind it produces. */
export class OperatorTyping {
  private static readonly ORDERING = new Set(['<', '<=', '>', '>=']);

  public static apply(
    operator: OperatorItem,
    operands: readonly TypedValue[],
    issues: FormulaIssue[],
    first: number,
  ): TypedValue {
    const definition = Operators.definition(operator.op);
    if (!definition) {
      return { kind: 'any', first };
    }

    const symbol = Operators.symbol(operator.op);
    if (definition.operandKind !== 'any') {
      OperatorTyping.checkOperandKinds(symbol, definition.operandKind, operands, issues);
    } else if (operands.length === 2 && definition.returnKind === 'bool') {
      OperatorTyping.checkComparison(operator.op, symbol, operands[0], operands[1], issues);
    }

    return { kind: definition.returnKind, first };
  }

  private static checkOperandKinds(
    symbol: string,
    expected: FormulaValueKind,
    operands: readonly TypedValue[],
    issues: FormulaIssue[],
  ): void {
    for (const operand of operands) {
      if (operand.kind !== 'any' && operand.kind !== expected) {
        issues.push({
          kind: 'type',
          blockId: operand.first,
          message: `${symbol} needs ${ValueKinds.LABELS[expected]}, but this is ${ValueKinds.LABELS[operand.kind]}.`,
        });
      }
    }
  }

  /** Both sides must be the same kind, and only ordered kinds can use < and >. */
  private static checkComparison(
    op: string,
    symbol: string,
    left: TypedValue,
    right: TypedValue,
    issues: FormulaIssue[],
  ): void {
    if (left.kind !== 'any' && right.kind !== 'any' && left.kind !== right.kind) {
      issues.push({
        kind: 'type',
        blockId: right.first,
        message: `Can't compare ${ValueKinds.LABELS[left.kind]} with ${ValueKinds.LABELS[right.kind]}.`,
      });
    } else if (OperatorTyping.ORDERING.has(op) && (left.kind === 'bool' || right.kind === 'bool')) {
      issues.push({
        kind: 'type',
        blockId: right.first,
        message: `${symbol} can't order true/false values.`,
      });
    }
  }
}
