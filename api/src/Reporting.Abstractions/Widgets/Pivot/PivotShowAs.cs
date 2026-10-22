namespace Reporting.Abstractions;

/// <summary>How a pivot measure's value is shown: as itself, or as a share of a larger total.</summary>
public enum PivotShowAs
{
    Value,
    /// <summary>A share of the same measure's total for its column (the grand total without column fields).</summary>
    PercentOfTotal,
    /// <summary>A share of the same measure for the enclosing group (the total for top-level groups).</summary>
    PercentOfParent
}
