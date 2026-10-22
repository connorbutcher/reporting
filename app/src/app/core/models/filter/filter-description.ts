import { FilterCondition } from './filter-condition.model';
import { FilterNode } from './filter-node.model';
import { OperatorCatalogue } from './operator-catalogue.model';
import { NamedColumn } from './named-column.model';

/**
 * A filter as short readable lines ("Region equals North") for a tooltip. An AND group reads as
 * separate lines and an OR group as one. Disabled conditions and conditions on columns the dataset
 * no longer has are left out, since they narrow nothing. Operator wording comes from the API's
 * catalogue when available, so it matches the filter panel.
 */
export class FilterDescription {
  private readonly byId: Map<string, NamedColumn>;

  private constructor(
    columns: readonly NamedColumn[],
    private readonly catalogue: OperatorCatalogue | null,
  ) {
    this.byId = new Map(columns.map((c) => [c.id, c]));
  }

  public static describe(
    filter: FilterNode | null,
    columns: readonly NamedColumn[],
    catalogue: OperatorCatalogue | null,
  ): string[] {
    if (!filter) {
      return [];
    }
    return [...new Set(new FilterDescription(columns, catalogue).lines(filter))];
  }

  /** "greaterThan" → "greater than", for an operator the catalogue has no label for. */
  private static spellOut(operator: string): string {
    return operator.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }

  private lines(node: FilterNode): string[] {
    if (node.kind === 'group' && node.join === 'and') {
      return node.children.flatMap((child) => this.lines(child));
    }
    const line = this.clause(node);
    return line ? [line] : [];
  }

  private clause(node: FilterNode): string | null {
    if (node.kind === 'condition') {
      return this.condition(node);
    }
    const parts = node.children
      .map((child) => this.clause(child))
      .filter((p): p is string => p !== null);
    if (parts.length === 0) {
      return null;
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return node.join === 'or' ? `(${parts.join(' or ')})` : parts.join(' and ');
  }

  private condition(c: FilterCondition): string | null {
    const column = this.byId.get(c.columnId);
    if (c.enabled === false || !column) {
      return null;
    }
    const label =
      this.catalogue?.[column.type]?.find((o) => o.value === c.operator)?.label ??
      FilterDescription.spellOut(c.operator);
    const operands = c.operator === 'between' ? c.values.join(' – ') : c.values.join(', ');
    return operands ? `${column.name} ${label} ${operands}` : `${column.name} ${label}`;
  }
}
