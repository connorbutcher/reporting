namespace Reporting.Abstractions;

public enum FilterOperandKind
{
    None,
    Text,
    Number,
    Date,

    /// <summary>Comma-separated, for <see cref="FilterOperator.In"/>.</summary>
    List
}
