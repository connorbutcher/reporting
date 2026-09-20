import { FilterCondition, FilterGroup, FilterNode, FilterOperator } from '../../core/models/filter';

/**
 * What a reader has changed from the published filters, keyed by filter entry (a dataset id for a
 * page filter, a widget id or `widgetId::bindingId` for a widget filter). A `null` value is a
 * filter the reader cleared — kept explicit so "removed the author's filter" isn't mistaken for
 * "never touched it". Untouched entries are simply absent.
 */
export type ViewFilterOverrides = Record<string, FilterGroup | null>;

/** Deep enough for any filter a reader can build; bounds the recursion on a hostile link. */
const MAX_DEPTH = 8;

type WireCondition =
  | [columnId: string, operator: string, values: string[]]
  | [columnId: string, operator: string, values: string[], disabled: 0];
interface WireGroup {
  j: 'a' | 'o';
  c: WireNode[];
}
type WireNode = WireGroup | WireCondition;

/**
 * The overrides as a URL-safe string, or null when there are none — so the param is omitted rather
 * than written empty. A compact wire format (not the raw DTO JSON) keeps shared links short,
 * since the URL length is the limit on how large a filter can be shared.
 */
export function encodeViewFilterOverrides(overrides: ViewFilterOverrides): string | null {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return null;

  const wire: Record<string, WireGroup | null> = {};
  for (const key of keys) {
    const group = overrides[key];
    wire[key] = group ? groupToWire(group) : null;
  }
  return toBase64Url(JSON.stringify(wire));
}

/**
 * Parses a param written by {@link encodeViewFilterOverrides}. An absent param is no overrides
 * (`{}`); anything unreadable or malformed is null, so a hand-edited or truncated link is ignored
 * as a whole rather than half-applied.
 */
export function decodeViewFilterOverrides(raw: string | null): ViewFilterOverrides | null {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(fromBase64Url(raw));
    if (!isRecord(parsed)) return null;

    const overrides: ViewFilterOverrides = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === null) {
        overrides[key] = null;
        continue;
      }
      const group = wireToGroup(value, 0);
      if (!group) return null;
      overrides[key] = group;
    }
    return overrides;
  } catch {
    return null;
  }
}

function groupToWire(group: FilterGroup): WireGroup {
  return {
    j: group.join === 'or' ? 'o' : 'a',
    c: group.children.map(nodeToWire),
  };
}

function nodeToWire(node: FilterNode): WireNode {
  if (node.kind === 'group') return groupToWire(node);
  return node.enabled === false
    ? [node.columnId, node.operator, node.values, 0]
    : [node.columnId, node.operator, node.values];
}

function wireToGroup(value: unknown, depth: number): FilterGroup | null {
  if (depth > MAX_DEPTH || !isRecord(value)) return null;
  if ((value['j'] !== 'a' && value['j'] !== 'o') || !Array.isArray(value['c'])) return null;

  const children: FilterNode[] = [];
  for (const child of value['c']) {
    const node = Array.isArray(child) ? wireToCondition(child) : wireToGroup(child, depth + 1);
    if (!node) return null;
    children.push(node);
  }
  return { kind: 'group', join: value['j'] === 'o' ? 'or' : 'and', children };
}

function wireToCondition(value: unknown[]): FilterCondition | null {
  const [columnId, operator, values, disabled] = value;
  if (typeof columnId !== 'string' || typeof operator !== 'string') return null;
  if (!Array.isArray(values) || !values.every((v) => typeof v === 'string')) return null;
  if (disabled !== undefined && disabled !== 0) return null;

  return {
    kind: 'condition',
    columnId,
    // Not checked against a fixed list: operators are catalogue data, and the filter builder
    // and server already reject one the column can't take.
    operator: operator as FilterOperator,
    values: values as string[],
    ...(disabled === 0 ? { enabled: false } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toBase64Url(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
