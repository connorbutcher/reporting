namespace Reporting.DAL.Repositories;

/// <summary>
/// One place a column's id appears in some JSON: what that place means, and what it needs of the
/// column's type — a number (a measure, a histogram's bins, a tolerance limit…), or, for a filter
/// condition, an operator and operands that its column type must support.
/// </summary>
public readonly record struct ColumnReference(
    Guid ColumnId,
    string Role,
    bool NeedsNumber = false,
    FilterConditionRef? Condition = null);
