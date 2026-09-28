import { KIND_LABELS } from '../kinds/kind-labels';
import { OperatorItem } from '../items/operator-item';
import { operatorDefinition, operatorSymbol } from '../operators/operator-lookup';
import { FormulaIssue } from './formula-issue';
import { TypedValue } from './typed-value';

const ORDERING_OPERATORS = new Set(['<', '<=', '>', '>=']);

/** Checks the operands of an operator against what it takes, and gives the kind it produces. */
export function applyOperator(operator: OperatorItem, operands: readonly TypedValue[], issues: FormulaIssue[], first: number): TypedValue {
  const definition = operatorDefinition(operator.op);
  if (!definition) {
    return { kind: 'any', first };
  }

  const symbol = operatorSymbol(operator.op);

  if (definition.operandKind !== 'any') {
    for (const operand of operands) {
      if (operand.kind !== 'any' && operand.kind !== definition.operandKind) {
        issues.push({
          kind: 'type',
          blockId: operand.first,
          message: `${symbol} needs ${KIND_LABELS[definition.operandKind]}, but this is ${KIND_LABELS[operand.kind]}.`,
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
        message: `Can't compare ${KIND_LABELS[left.kind]} with ${KIND_LABELS[right.kind]}.`,
      });
    } else if (ORDERING_OPERATORS.has(operator.op) && (left.kind === 'bool' || right.kind === 'bool')) {
      issues.push({ kind: 'type', blockId: right.first, message: `${symbol} can't order true/false values.` });
    }
  }

  return { kind: definition.returnKind, first };
}
