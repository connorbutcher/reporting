namespace Reporting.Abstractions;

/// <summary>What the panel should render for an operator's operands.</summary>
public enum FilterOperandKind
{
    None,
    Text,
    Number,
    Date,
    /// <summary>A comma-separated list of values, for <see cref="FilterOperator.In"/>.</summary>
    List
}
