import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { FunctionBlock } from '../items/function-block';
import { GroupBlock } from '../items/group-block';
import { isOperand } from '../items/is-operand';
import { LiteralBlock } from '../items/literal-block';
import { OperandItem } from '../items/operand-item';
import { OperatorItem } from '../items/operator-item';
import { NEGATION_PRECEDENCE } from '../operators/negation-precedence';
import { operatorDefinition } from '../operators/operator-lookup';
import { foldRpn } from '../rpn/fold-rpn';
import { toRpn } from '../rpn/to-rpn';
import { BlockSpan } from './block-span';
import { FormulaSegment } from './formula-segment';
import { needsBrackets } from './needs-brackets';
import { ParentContext } from './parent-context';
import { RpnNode } from './rpn-node';
import { RpnNodeFolder } from './rpn-node-folder';
import { SegmentStyle } from './segment-style';
import { SerializedFormula } from './serialized-formula';
import { SlotDescription } from './slot-description';

const INDENT = '  ';
const NODE_FOLDER = new RpnNodeFolder();

/**
 * Writes a formula as text, the way the server's parser reads it. Each expression goes through reverse
 * Polish notation into a tree, and the tree is written with just the brackets its shape needs — beyond
 * those the user put in as groups. A function whose arguments are more than plain values is laid out one
 * argument per line, so a nested formula reads as a tree. An expression that doesn't fit together yet is
 * written as it stands, with placeholders where something is missing.
 */
export class FormulaWriter {
  private readonly segments: FormulaSegment[] = [];
  private readonly spans = new Map<number, BlockSpan>();
  private offset = 0;
  private complete = true;

  constructor(private readonly describe: (call: FunctionBlock, index: number) => SlotDescription) {}

  public write(root: Expression): SerializedFormula {
    if (root.length === 0) {
      this.complete = false;
    } else {
      this.emitExpression(root, 0);
    }

    const text = this.segments.map((segment) => segment.text).join('');
    return { text, segments: this.segments, spans: this.spans, complete: this.complete };
  }

  private push(text: string, style: SegmentStyle, blockId: number | null): void {
    this.segments.push({ text, style, blockId });
    this.offset += text.length;
  }

  private placeholder(label: string, blockId: number | null): void {
    this.complete = false;
    this.push(`‹${label} missing›`, 'missing', blockId);
  }

  private span(id: number, start: number): void {
    this.spans.set(id, { start, end: this.offset });
  }

  private emitExpression(expression: Expression, depth: number): void {
    const rpn = toRpn(expression);
    if (rpn.issues.length > 0) {
      this.complete = false;
      this.emitFlat(expression, depth);
      return;
    }

    const [tree] = foldRpn<RpnNode>(rpn.tokens, NODE_FOLDER);
    if (tree) {
      this.emitNode(tree, null, depth);
    }
  }

  /** An expression that can't be built into a tree yet: its items in the order they were placed, gaps marked. */
  private emitFlat(expression: Expression, depth: number): void {
    let previous: FormulaItem | null = null;

    for (const item of expression) {
      if (isOperand(item)) {
        if (previous && isOperand(previous)) {
          this.push(' ', 'punctuation', item.id);
          this.placeholder('operator', item.id);
          this.push(' ', 'punctuation', item.id);
        }

        this.emitOperand(item, depth);
      } else {
        if (!previous || (!isOperand(previous) && item.op !== 'NOT' && item.op !== '-')) {
          this.placeholder('value', item.id);
        }

        this.emitOperator(item, previous === null || !isOperand(previous));
      }

      previous = item;
    }

    if (previous && !isOperand(previous)) {
      this.placeholder('value', previous.id);
    }
  }

  private emitOperator(operator: OperatorItem, prefix: boolean): void {
    const start = this.offset;
    const text = operator.op === 'NOT' ? 'NOT ' : prefix && operator.op === '-' ? '-' : ` ${operator.op} `;
    this.push(text, 'operator', operator.id);
    this.span(operator.id, start);
  }

  private emitNode(node: RpnNode, parent: ParentContext | null, depth: number): void {
    switch (node.type) {
      case 'missing':
        this.placeholder('value', node.operatorId);
        return;

      case 'operand':
        this.emitOperandIn(node.item, parent, depth);
        return;

      case 'unary':
        this.emitUnary(node.operator, node.argument, parent, depth);
        return;

      case 'binary':
        this.emitBinary(node.operator, node.left, node.right, parent, depth);
        return;
    }
  }

  private emitUnary(operator: OperatorItem, argument: RpnNode, parent: ParentContext | null, depth: number): void {
    const precedence = operator.op === 'NOT' ? (operatorDefinition('NOT')?.precedence ?? 3) : NEGATION_PRECEDENCE;
    const wrap = parent !== null && precedence < parent.precedence;

    if (wrap) {
      this.push('(', 'punctuation', operator.id);
    }

    this.emitOperator(operator, true);
    this.emitNode(argument, { precedence, associativity: 'right', side: 'right', operator: operator.op }, depth);

    if (wrap) {
      this.push(')', 'punctuation', operator.id);
    }
  }

  private emitBinary(operator: OperatorItem, left: RpnNode, right: RpnNode, parent: ParentContext | null, depth: number): void {
    const definition = operatorDefinition(operator.op);
    const precedence = definition?.precedence ?? 0;
    const associativity = definition?.associativity ?? 'left';
    const wrap = parent !== null && needsBrackets(precedence, parent);

    if (wrap) {
      this.push('(', 'punctuation', operator.id);
    }

    this.emitNode(left, { precedence, associativity, side: 'left', operator: operator.op }, depth);
    this.emitOperator(operator, false);
    this.emitNode(right, { precedence, associativity, side: 'right', operator: operator.op }, depth);

    if (wrap) {
      this.push(')', 'punctuation', operator.id);
    }
  }

  /** A negative number written as the left of `^` needs brackets, or it would read as a negation of the whole power. */
  private emitOperandIn(item: OperandItem, parent: ParentContext | null, depth: number): void {
    const negativeBase =
      item.kind === 'literal' && typeof item.value === 'number' && item.value < 0 && parent?.operator === '^' && parent.side === 'left';

    if (negativeBase) {
      this.push('(', 'punctuation', item.id);
    }

    this.emitOperand(item, depth);

    if (negativeBase) {
      this.push(')', 'punctuation', item.id);
    }
  }

  private emitOperand(item: OperandItem, depth: number): void {
    const start = this.offset;

    switch (item.kind) {
      case 'column':
        this.push(`[${item.name}]`, 'column', item.id);
        break;
      case 'literal':
        this.emitLiteral(item);
        break;
      case 'group':
        this.emitGroup(item, depth);
        break;
      case 'function':
        this.emitCall(item, depth);
        break;
    }

    this.span(item.id, start);
  }

  private emitLiteral(item: LiteralBlock): void {
    const { value } = item;

    if (value === null) {
      this.push('NULL', 'blank', item.id);
    } else if (typeof value === 'number') {
      this.push(String(value), 'number', item.id);
    } else if (typeof value === 'boolean') {
      this.push(value ? 'TRUE' : 'FALSE', 'bool', item.id);
    } else {
      this.push(`"${value.replaceAll('"', '""')}"`, 'text', item.id);
    }
  }

  private emitGroup(item: GroupBlock, depth: number): void {
    this.push('(', 'punctuation', item.id);

    if (item.body.length === 0) {
      this.placeholder('value', item.id);
    } else {
      this.emitExpression(item.body, depth);
    }

    this.push(')', 'punctuation', item.id);
  }

  private emitCall(call: FunctionBlock, depth: number): void {
    this.push(call.name, 'function', call.id);
    this.push('(', 'punctuation', call.id);

    const args = this.argumentsToWrite(call);
    const nested = args.some(isNestedArgument);

    for (let index = 0; index < args.length; index++) {
      if (index > 0) {
        this.push(nested ? ',' : ', ', 'punctuation', call.id);
      }

      if (nested) {
        this.push(`\n${INDENT.repeat(depth + 1)}`, 'punctuation', call.id);
      }

      if (args[index].length === 0) {
        this.placeholder(this.describe(call, index).name, call.id);
      } else {
        this.emitExpression(args[index], depth + 1);
      }
    }

    if (nested) {
      this.push(`\n${INDENT.repeat(depth)}`, 'punctuation', call.id);
    }

    this.push(')', 'punctuation', call.id);
  }

  /** Empty optional arguments at the end are simply left out of the text. */
  private argumentsToWrite(call: FunctionBlock): Expression[] {
    let last = call.args.length;
    while (last > 0 && call.args[last - 1].length === 0 && this.describe(call, last - 1).optional) {
      last--;
    }

    return call.args.slice(0, last);
  }
}

/** An argument that is more than a plain value, so the call is laid out one argument per line. */
function isNestedArgument(arg: Expression): boolean {
  return arg.length > 1 || (arg.length === 1 && (arg[0].kind === 'function' || arg[0].kind === 'group'));
}
