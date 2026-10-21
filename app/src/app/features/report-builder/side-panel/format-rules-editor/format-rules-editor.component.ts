import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormatRule, FormatRuleOperator, FormatRuleStyle } from '../../../../core/models/report';
import { SelectOption } from '../select-option';

/**
 * Edits a list of conditional-format rules ("when the value is greater than 100, show it red"), shared
 * by a table column's settings and a pivot measure. Rules are checked in order and the first match wins,
 * so the list reads top to bottom as the order they're tried.
 */
@Component({
  selector: 'app-format-rules-editor',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './format-rules-editor.component.html',
  styleUrl: './format-rules-editor.component.scss',
})
export class FormatRulesEditorComponent {
  /** Comparison choices, with whether each takes one operand, two, or none. */
  private static readonly OPERATORS: (SelectOption<FormatRuleOperator> & {
    operands: 0 | 1 | 2;
  })[] = [
    { label: 'is greater than', value: 'greaterThan', operands: 1 },
    { label: 'is at least', value: 'greaterThanOrEqual', operands: 1 },
    { label: 'is less than', value: 'lessThan', operands: 1 },
    { label: 'is at most', value: 'lessThanOrEqual', operands: 1 },
    { label: 'is between', value: 'between', operands: 2 },
    { label: 'equals', value: 'equals', operands: 1 },
    { label: 'does not equal', value: 'notEquals', operands: 1 },
    { label: 'contains', value: 'contains', operands: 1 },
    { label: 'is empty', value: 'isEmpty', operands: 0 },
  ];
  private static readonly STYLES: SelectOption<FormatRuleStyle>[] = [
    { label: 'Red', value: 'red' },
    { label: 'Amber', value: 'amber' },
    { label: 'Green', value: 'green' },
    { label: 'Blue', value: 'blue' },
    { label: 'Bold', value: 'bold' },
  ];

  public readonly rules = input.required<readonly FormatRule[]>();
  public readonly rulesChange = output<FormatRule[]>();

  public readonly operators = FormatRulesEditorComponent.OPERATORS;
  public readonly styles = FormatRulesEditorComponent.STYLES;

  public operands(rule: FormatRule): number {
    return (
      FormatRulesEditorComponent.OPERATORS.find((o) => o.value === rule.operator)?.operands ?? 1
    );
  }

  public add(): void {
    this.rulesChange.emit([...this.rules(), { operator: 'greaterThan', value: '', style: 'red' }]);
  }

  public update(index: number, patch: Partial<FormatRule>): void {
    this.rulesChange.emit(
      this.rules().map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  }

  public remove(index: number): void {
    this.rulesChange.emit(this.rules().filter((_, i) => i !== index));
  }
}
