import { OperandItem } from '../items/operand-item';
import { OperatorItem } from '../items/operator-item';
import { RpnFolder } from '../rpn/rpn-folder';
import { RpnNode } from './rpn-node';

/** Builds the tree out of the reverse Polish tokens. */
export class RpnNodeFolder implements RpnFolder<RpnNode> {
  public operand(item: OperandItem): RpnNode {
    return { type: 'operand', item };
  }

  public missing(operatorId: number | null): RpnNode {
    return { type: 'missing', operatorId };
  }

  public unary(operator: OperatorItem, argument: RpnNode): RpnNode {
    return { type: 'unary', operator, argument };
  }

  public binary(operator: OperatorItem, left: RpnNode, right: RpnNode): RpnNode {
    return { type: 'binary', operator, left, right };
  }
}
