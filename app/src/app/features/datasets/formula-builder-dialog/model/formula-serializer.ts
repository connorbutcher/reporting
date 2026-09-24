import {
  Expression,
  FormulaItem,
  FunctionBlock,
  GroupBlock,
  LiteralBlock,
  NEGATION_PRECEDENCE,
  OperandItem,
  OperatorAssociativity,
  OperatorItem,
  isOperand,
  operatorDefinition,
} from './formula-block';
import { foldRpn, toRpn } from './formula-rpn';

export type SegmentStyle = 'function' | 'column' | 'number' | 'text' | 'bool' | 'blank' | 'operator' | 'punctuation' | 'missing';

/** A run of formula text and the item it belongs to, for the readable, highlighted view. */
export interface FormulaSegment {
  text: string;
  style: SegmentStyle;
  /** The item this text stands for; a missing value carries the item it should have been beside (or its function). */
  blockId: number | null;
}

export interface BlockSpan {
  start: number;
  end: number;
}

export interface SerializedFormula {
  /** The formula as text. Only valid formula text when {@link complete}. */
  text: string;
  segments: FormulaSegment[];
  /** Where each item's text sits in {@link text}, for mapping a server error position back to an item. */
  spans: Map<number, BlockSpan>;
  /** False when something is missing, so {@link text} holds a placeholder and mustn't be sent to the server. */
  complete: boolean;
}

/** What the serializer needs to know about a function's argument: what to call it in a placeholder, and whether it may be left out. */
export interface SlotDescription {
  name: string;
  optional: boolean;
}

/** A node of the tree that reverse Polish notation builds from a sequence. */
type Node =
  | { type: 'operand'; item: OperandItem }
  | { type: 'missing'; operatorId: number | null }
  | { type: 'unary'; operator: OperatorItem; argument: Node }
  | { type: 'binary'; operator: OperatorItem; left: Node; right: Node };

interface ParentContext {
  precedence: number;
  associativity: OperatorAssociativity;
  side: 'left' | 'right';
  operator: string;
}

const INDENT = '  ';

/**
 * Writes the formula as text, the way the server's parser reads it. Each expression goes through reverse
 * Polish notation into a tree, and the tree is written with just the brackets its shape needs — beyond
 * those the user put in as groups. A function whose arguments are more than plain values is laid out one
 * argument per line, so a nested formula reads as a tree. An expression that doesn't fit together yet is
 * written as it stands, with placeholders where something is missing.
 */
export function serializeFormula(
  root: Expression,
  describe: (call: FunctionBlock, index: number) => SlotDescription,
): SerializedFormula {
  const segments: FormulaSegment[] = [];
  const spans = new Map<number, BlockSpan>();
  let offset = 0;
  let complete = true;

  const push = (text: string, style: SegmentStyle, blockId: number | null): void => {
    segments.push({ text, style, blockId });
    offset += text.length;
  };

  const placeholder = (label: string, blockId: number | null): void => {
    complete = false;
    push(`‹${label} missing›`, 'missing', blockId);
  };

  const span = (id: number, start: number): void => {
    spans.set(id, { start, end: offset });
  };

  const emitExpression = (expression: Expression, depth: number): void => {
    const rpn = toRpn(expression);
    if (rpn.issues.length > 0) {
      complete = false;
      emitFlat(expression, depth);
      return;
    }

    const [tree] = foldRpn<Node>(rpn.tokens, {
      operand: (item) => ({ type: 'operand', item }),
      missing: (operatorId) => ({ type: 'missing', operatorId }),
      unary: (operator, argument) => ({ type: 'unary', operator, argument }),
      binary: (operator, left, right) => ({ type: 'binary', operator, left, right }),
    });
    if (tree) emitNode(tree, null, depth);
  };

  /** An expression that can't be built into a tree yet: its items in the order they were placed, gaps marked. */
  const emitFlat = (expression: Expression, depth: number): void => {
    let previous: FormulaItem | null = null;
    for (const item of expression) {
      if (isOperand(item)) {
        if (previous && isOperand(previous)) {
          push(' ', 'punctuation', item.id);
          placeholder('operator', item.id);
          push(' ', 'punctuation', item.id);
        }
        emitOperand(item, depth);
      } else {
        if (!previous || (!isOperand(previous) && item.op !== 'NOT' && item.op !== '-')) placeholder('value', item.id);
        emitOperator(item, previous === null || !isOperand(previous));
      }
      previous = item;
    }
    if (previous && !isOperand(previous)) placeholder('value', previous.id);
  };

  const emitOperator = (operator: OperatorItem, prefix: boolean): void => {
    const start = offset;
    const text = operator.op === 'NOT' ? 'NOT ' : prefix && operator.op === '-' ? '-' : ` ${operator.op} `;
    push(text, 'operator', operator.id);
    span(operator.id, start);
  };

  const emitNode = (node: Node, parent: ParentContext | null, depth: number): void => {
    switch (node.type) {
      case 'missing':
        placeholder('value', node.operatorId);
        return;

      case 'operand':
        emitOperandIn(node.item, parent, depth);
        return;

      case 'unary': {
        const precedence = node.operator.op === 'NOT' ? (operatorDefinition('NOT')?.precedence ?? 3) : NEGATION_PRECEDENCE;
        const wrap = parent !== null && precedence < parent.precedence;
        if (wrap) push('(', 'punctuation', node.operator.id);
        emitOperator(node.operator, true);
        emitNode(node.argument, { precedence, associativity: 'right', side: 'right', operator: node.operator.op }, depth);
        if (wrap) push(')', 'punctuation', node.operator.id);
        return;
      }

      case 'binary': {
        const definition = operatorDefinition(node.operator.op);
        const precedence = definition?.precedence ?? 0;
        const associativity = definition?.associativity ?? 'left';
        const wrap = parent !== null && needsBrackets(precedence, parent);
        if (wrap) push('(', 'punctuation', node.operator.id);
        emitNode(node.left, { precedence, associativity, side: 'left', operator: node.operator.op }, depth);
        emitOperator(node.operator, false);
        emitNode(node.right, { precedence, associativity, side: 'right', operator: node.operator.op }, depth);
        if (wrap) push(')', 'punctuation', node.operator.id);
        return;
      }
    }
  };

  /** A negative number written as the left of `^` needs brackets, or it would read as a negation of the whole power. */
  const emitOperandIn = (item: OperandItem, parent: ParentContext | null, depth: number): void => {
    const negativeBase =
      item.kind === 'literal' && typeof item.value === 'number' && item.value < 0 && parent?.operator === '^' && parent.side === 'left';
    if (negativeBase) push('(', 'punctuation', item.id);
    emitOperand(item, depth);
    if (negativeBase) push(')', 'punctuation', item.id);
  };

  const emitOperand = (item: OperandItem, depth: number): void => {
    const start = offset;
    switch (item.kind) {
      case 'column':
        push(`[${item.name}]`, 'column', item.id);
        break;
      case 'literal':
        emitLiteral(item);
        break;
      case 'group':
        emitGroup(item, depth);
        break;
      case 'function':
        emitCall(item, depth);
        break;
    }
    span(item.id, start);
  };

  const emitLiteral = (item: LiteralBlock): void => {
    const { value } = item;
    if (value === null) push('NULL', 'blank', item.id);
    else if (typeof value === 'number') push(String(value), 'number', item.id);
    else if (typeof value === 'boolean') push(value ? 'TRUE' : 'FALSE', 'bool', item.id);
    else push(`"${value.replaceAll('"', '""')}"`, 'text', item.id);
  };

  const emitGroup = (item: GroupBlock, depth: number): void => {
    push('(', 'punctuation', item.id);
    if (item.body.length === 0) placeholder('value', item.id);
    else emitExpression(item.body, depth);
    push(')', 'punctuation', item.id);
  };

  const emitCall = (call: FunctionBlock, depth: number): void => {
    push(call.name, 'function', call.id);
    push('(', 'punctuation', call.id);

    // Empty optional arguments at the end are simply left out of the text.
    let last = call.args.length;
    while (last > 0 && call.args[last - 1].length === 0 && describe(call, last - 1).optional) last--;
    const args = call.args.slice(0, last);
    const nested = args.some((arg) => arg.length > 1 || (arg.length === 1 && (arg[0].kind === 'function' || arg[0].kind === 'group')));

    args.forEach((arg, index) => {
      if (index > 0) push(nested ? ',' : ', ', 'punctuation', call.id);
      if (nested) push(`\n${INDENT.repeat(depth + 1)}`, 'punctuation', call.id);
      if (arg.length === 0) placeholder(describe(call, index).name, call.id);
      else emitExpression(arg, depth + 1);
    });

    if (nested) push(`\n${INDENT.repeat(depth)}`, 'punctuation', call.id);
    push(')', 'punctuation', call.id);
  };

  if (root.length === 0) complete = false;
  else emitExpression(root, 0);

  return { text: segments.map((s) => s.text).join(''), segments, spans, complete };
}

/**
 * Whether a child with this precedence needs brackets under its parent. Equal precedence needs them on the
 * side the operator doesn't group towards — and on both sides for a comparison, which can't be chained.
 */
function needsBrackets(precedence: number, parent: ParentContext): boolean {
  if (precedence !== parent.precedence) return precedence < parent.precedence;
  if (parent.associativity === 'none') return true;
  return parent.associativity === 'left' ? parent.side === 'right' : parent.side === 'left';
}

/** The innermost item whose text contains `position` — where a server error at that offset belongs. */
export function blockAtPosition(spans: ReadonlyMap<number, BlockSpan>, position: number): number | null {
  let best: number | null = null;
  let bestLength = Infinity;
  for (const [id, span] of spans) {
    const length = span.end - span.start;
    if (position >= span.start && position < Math.max(span.end, span.start + 1) && length < bestLength) {
      best = id;
      bestLength = length;
    }
  }
  return best;
}
