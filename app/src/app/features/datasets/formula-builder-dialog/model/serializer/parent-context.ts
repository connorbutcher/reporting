import { OperatorAssociativity } from '../operators/operator-associativity';

/** The operator a node is written under, for deciding whether the node needs brackets. */
export interface ParentContext {
  precedence: number;
  associativity: OperatorAssociativity;
  side: 'left' | 'right';
  operator: string;
}
