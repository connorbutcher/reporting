import { ValueKinds } from '../kinds/value-kinds';
import { OperatorItem } from '../items/operator-item';
import { Operators } from '../operators/operators';
import { FormulaIssue } from './formula-issue';
import { TypedValue } from './typed-value';

export class OperatorTyping {
  private static readonly ORDERING = new Set(['<', '<=', '>', '>=']);

  /** Checks the operands of an operator against what it takes, and gives the kind it produces. */
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
      for (const operand of operands) {
        if (operand.kind !== 'any' && operand.kind !== definition.operandKind) {
          issues.push({
            kind: 'type',
            blockId: operand.first,
            message: `${symbol} needs ${ValueKinds.LABELS[definition.operandKind]}, but this is ${ValueKinds.LABELS[operand.kind]}.`,
          });
        }
      }
    } else if (operands.length === 2 && definition.returnKind === 'bool') {
      // Comparisons: both sides the same kind, and only ordered kinds for < >.
      const [left, right] = operands;
      if (left.kind !== 'any' && right.kind !== 'any' && left.kind !== right.kind) {
        issues.push({
          kind: 'type',
          blockId: right.first,
          message: `Can't compare ${ValueKinds.LABELS[left.kind]} with ${ValueKinds.LABELS[right.kind]}.`,
        });
      } else if (
        OperatorTyping.ORDERING.has(operator.op) &&
        (left.kind === 'bool' || right.kind === 'bool')
      ) {
        issues.push({
          kind: 'type',
          blockId: right.first,
          message: `${symbol} can't order true/false values.`,
        });
      }
    }

    return { kind: definition.returnKind, first };
  }
}
