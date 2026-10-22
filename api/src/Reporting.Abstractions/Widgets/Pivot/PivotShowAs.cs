namespace Reporting.Abstractions;

public enum PivotShowAs
{
    Value,
    /// <summary>Of the measure's column total, or the grand total without column fields.</summary>
    PercentOfTotal,
    /// <summary>Of the enclosing group, or the total for top-level groups.</summary>
    PercentOfParent
}
