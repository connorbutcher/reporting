namespace Reporting.Abstractions;

/// <summary>A conditional format, evaluated by the client; the first matching rule wins.</summary>
public class FormatRule
{
    public FormatRuleOperator Operator { get; set; } = FormatRuleOperator.GreaterThan;
    public string Value { get; set; } = string.Empty;
    public string? Value2 { get; set; }
    public FormatRuleStyle Style { get; set; } = FormatRuleStyle.Red;
}
