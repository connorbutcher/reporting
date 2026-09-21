import { DatasetColumn } from '../dataset';
import { FilterCondition, FilterNode } from './filter.model';
import { OperatorCatalogue } from './operator-catalogue.model';

type NamedColumn = Pick<DatasetColumn, 'id' | 'name' | 'type'>;

/**
 * A filter as short human-readable lines — "Region equals North" — for a tooltip that tells a reader
 * what is narrowing a widget. Each line is one condition, or one OR-group ("A or B"); the conditions
 * of an AND group read as separate lines, since that is what they mean. Disabled conditions are left
 * out (they narrow nothing), as are conditions on columns the dataset no longer has (the server
 * ignores those too).
 *
 * Operator wording comes from the API's catalogue so it matches the filter panel; without it the
 * operator's own name is spelled out instead.
 */
export function describeFilter(
  filter: FilterNode | null,
  columns: readonly NamedColumn[],
  catalogue: OperatorCatalogue | null,
): string[] {
  if (!filter) return [];
  const byId = new Map(columns.map((c) => [c.id, c]));

  const condition = (c: FilterCondition): string | null => {
    const column = byId.get(c.columnId);
    if (c.enabled === false || !column) return null;
    const label =
      catalogue?.[column.type]?.find((o) => o.value === c.operator)?.label ?? spellOut(c.operator);
    const operands = c.operator === 'between' ? c.values.join(' – ') : c.values.join(', ');
    return operands ? `${column.name} ${label} ${operands}` : `${column.name} ${label}`;
  };

  // One line for a node: a group of several parts reads as a single clause.
  const clause = (node: FilterNode): string | null => {
    if (node.kind === 'condition') return condition(node);
    const parts = node.children.map(clause).filter((p): p is string => p !== null);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    return node.join === 'or' ? `(${parts.join(' or ')})` : parts.join(' and ');
  };

  // The top of an AND tree is a list of things that must all hold: show them one per line.
  const lines = (node: FilterNode): string[] => {
    if (node.kind === 'group' && node.join === 'and') return node.children.flatMap(lines);
    const line = clause(node);
    return line ? [line] : [];
  };

  return [...new Set(lines(filter))];
}

/** "greaterThan" → "greater than", for an operator the catalogue has no label for. */
function spellOut(operator: string): string {
  return operator.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}
