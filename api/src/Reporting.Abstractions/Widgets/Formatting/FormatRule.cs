namespace Reporting.Abstractions;

/// <summary>
/// One conditional-format rule on a table column or pivot measure: when the cell's value satisfies
/// <see cref="Operator"/> against <see cref="Value"/> (and <see cref="Value2"/> for Between), the cell
/// takes <see cref="Style"/>. Rules are stored with the widget and evaluated by the client against
/// each cell's raw value; the first matching rule wins.
/// </summary>
public class FormatRule
{
    public FormatRuleOperator Operator { get; set; } = FormatRuleOperator.GreaterThan;
    public string Value { get; set; } = string.Empty;
    public string? Value2 { get; set; }
    public FormatRuleStyle Style { get; set; } = FormatRuleStyle.Red;
}
