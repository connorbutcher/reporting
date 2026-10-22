namespace Reporting.Abstractions;

/// <summary>How a conditional-format rule compares a cell's value to its operands.</summary>
public enum FormatRuleOperator
{
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Equals,
    NotEquals,
    Between,
    Contains,
    IsEmpty
}
