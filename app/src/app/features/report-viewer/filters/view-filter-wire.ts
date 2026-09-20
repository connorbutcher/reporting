import { FilterCondition, FilterGroup, FilterNode, FilterOperator } from '../../../core/models/filter';

/** Bounds recursion on a hostile payload; deeper than any filter a reader can build. */
const MAX_DEPTH = 8;

type WireCondition =
  | [columnId: string, operator: string, values: string[]]
  | [columnId: string, operator: string, values: string[], disabled: 0];

export interface WireGroup {
  j: 'a' | 'o';
  c: WireNode[];
}

type WireNode = WireGroup | WireCondition;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function groupToWire(group: FilterGroup): WireGroup {
  return { j: group.join === 'or' ? 'o' : 'a', c: group.children.map(nodeToWire) };
}

/** Null when the value isn't a well-formed group. */
export function wireToGroup(value: unknown, depth = 0): FilterGroup | null {
  if (depth > MAX_DEPTH || !isRecord(value)) return null;
  const { j, c } = value;
  if ((j !== 'a' && j !== 'o') || !Array.isArray(c)) return null;

  const children: FilterNode[] = [];
  for (const child of c) {
    const node = Array.isArray(child) ? wireToCondition(child) : wireToGroup(child, depth + 1);
    if (!node) return null;
    children.push(node);
  }
  return { kind: 'group', join: j === 'o' ? 'or' : 'and', children };
}

function nodeToWire(node: FilterNode): WireNode {
  if (node.kind === 'group') return groupToWire(node);
  return node.enabled === false
    ? [node.columnId, node.operator, node.values, 0]
    : [node.columnId, node.operator, node.values];
}

function wireToCondition(value: unknown[]): FilterCondition | null {
  const [columnId, operator, values, disabled] = value;
  if (typeof columnId !== 'string' || typeof operator !== 'string') return null;
  if (!Array.isArray(values) || !values.every((v) => typeof v === 'string')) return null;
  if (disabled !== undefined && disabled !== 0) return null;

  return {
    kind: 'condition',
    columnId,
    // Operators are catalogue data; the filter builder and server reject an unsupported one.
    operator: operator as FilterOperator,
    values: values as string[],
    ...(disabled === 0 ? { enabled: false } : {}),
  };
}
