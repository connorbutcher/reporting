import {
  FilterCondition,
  FilterGroup,
  FilterNode,
  FilterOperator,
} from '../../../core/models/filter';
import { WireGroup } from './wire-group';
import { WireNode } from './wire-node';

/** The compact JSON shape filters take in a shared link. */
export class ViewFilterWire {
  /** Bounds recursion on a hostile payload; deeper than any filter a reader can build. */
  private static readonly MAX_DEPTH = 8;

  public static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  public static fromGroup(group: FilterGroup): WireGroup {
    return { j: group.join === 'or' ? 'o' : 'a', c: group.children.map(ViewFilterWire.nodeToWire) };
  }

  /** Null when the value isn't a well-formed group. */
  public static toGroup(value: unknown, depth = 0): FilterGroup | null {
    if (depth > ViewFilterWire.MAX_DEPTH || !ViewFilterWire.isRecord(value)) {
      return null;
    }
    const { j, c } = value;
    if ((j !== 'a' && j !== 'o') || !Array.isArray(c)) {
      return null;
    }

    const children: FilterNode[] = [];
    for (const child of c) {
      const node = Array.isArray(child)
        ? ViewFilterWire.wireToCondition(child)
        : ViewFilterWire.toGroup(child, depth + 1);
      if (!node) {
        return null;
      }
      children.push(node);
    }
    return { kind: 'group', join: j === 'o' ? 'or' : 'and', children };
  }

  private static nodeToWire(node: FilterNode): WireNode {
    if (node.kind === 'group') {
      return ViewFilterWire.fromGroup(node);
    }
    return node.enabled === false
      ? [node.columnId, node.operator, node.values, 0]
      : [node.columnId, node.operator, node.values];
  }

  private static wireToCondition(value: unknown[]): FilterCondition | null {
    const [columnId, operator, values, disabled] = value;
    if (typeof columnId !== 'string' || typeof operator !== 'string') {
      return null;
    }
    if (!Array.isArray(values) || !values.every((v) => typeof v === 'string')) {
      return null;
    }
    if (disabled !== undefined && disabled !== 0) {
      return null;
    }

    return {
      kind: 'condition',
      columnId,
      // Operators are catalogue data; the filter builder and server reject an unsupported one.
      operator: operator as FilterOperator,
      values: values as string[],
      ...(disabled === 0 ? { enabled: false } : {}),
    };
  }
}
