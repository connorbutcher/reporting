import { FormulaValueKind } from '../../../../../core/models/dataset';
import { OperatorAssociativity } from './operator-associativity';

export interface OperatorDefinition {
  /** As the formula language writes it. */
  op: string;
  /** As the builder shows it. */
  symbol: string;
  description: string;
  /** What kind of value it takes on each side. */
  operandKind: FormulaValueKind;
  returnKind: FormulaValueKind;
  /** Binding strength; higher binds tighter. */
  precedence: number;
  associativity: OperatorAssociativity;
  /** Takes one value, on its right (NOT). */
  prefixOnly?: boolean;
}
