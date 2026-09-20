using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// The default operator catalogue: which operators each column type offers, with labels and operand
/// shapes. The one definition of it: it seeds the FilterOperatorDefinitions table, and the DAL builds
/// the same rows in memory when there's no database, so the two can't drift.
/// </summary>
public static class FilterOperatorSeedData
{
    public static List<FilterOperatorDefinition> Rows()
    {
        var rows = new List<FilterOperatorDefinition>();
        rows.AddRange(For(DatasetColumnType.String, StringOperators()));
        rows.AddRange(For(DatasetColumnType.Int, NumberOperators()));
        rows.AddRange(For(DatasetColumnType.Double, NumberOperators()));
        rows.AddRange(For(DatasetColumnType.Bool, BoolOperators()));
        rows.AddRange(For(DatasetColumnType.DateTime, DateOperators()));

        for (var i = 0; i < rows.Count; i++) rows[i].Id = i + 1;
        return rows;
    }

    private static IEnumerable<FilterOperatorDefinition> For(DatasetColumnType type, IEnumerable<FilterOperatorDefinition> operators)
    {
        var order = 0;
        foreach (var op in operators)
        {
            op.ColumnType = type;
            op.SortOrder = order++;
            yield return op;
        }
    }

    private static FilterOperatorDefinition Op(
        FilterOperator value,
        string label,
        int operandCount = 1,
        FilterOperandKind kind = FilterOperandKind.Text) =>
        new() { Operator = value, Label = label, OperandCount = operandCount, OperandKind = kind };

    /// <summary>Presence checks, meaningful for every type.</summary>
    private static IEnumerable<FilterOperatorDefinition> Presence() =>
    [
        Op(FilterOperator.IsEmpty, "is empty", 0, FilterOperandKind.None),
        Op(FilterOperator.IsNotEmpty, "is not empty", 0, FilterOperandKind.None)
    ];

    /// <summary>Only offerable on a numeric column with banding (the client hides them otherwise). No operand: the bounds come from the banding at query time.</summary>
    private static IEnumerable<FilterOperatorDefinition> Tolerance() =>
    [
        Op(FilterOperator.InTolerance, "is in tolerance", 0, FilterOperandKind.None),
        Op(FilterOperator.NeedsConcession, "needs concession", 0, FilterOperandKind.None),
        Op(FilterOperator.OutOfTolerance, "is out of tolerance", 0, FilterOperandKind.None)
    ];

    private static IEnumerable<FilterOperatorDefinition> StringOperators() =>
    [
        Op(FilterOperator.Equals, "is"),
        Op(FilterOperator.NotEquals, "is not"),
        Op(FilterOperator.Contains, "contains"),
        Op(FilterOperator.NotContains, "does not contain"),
        Op(FilterOperator.StartsWith, "starts with"),
        Op(FilterOperator.EndsWith, "ends with"),
        Op(FilterOperator.In, "is any of", 1, FilterOperandKind.List),
        .. Presence()
    ];

    /// <summary>Shared by Int and Double.</summary>
    private static IEnumerable<FilterOperatorDefinition> NumberOperators() =>
    [
        Op(FilterOperator.Equals, "=", 1, FilterOperandKind.Number),
        Op(FilterOperator.NotEquals, "≠", 1, FilterOperandKind.Number),
        Op(FilterOperator.GreaterThan, ">", 1, FilterOperandKind.Number),
        Op(FilterOperator.GreaterThanOrEqual, "≥", 1, FilterOperandKind.Number),
        Op(FilterOperator.LessThan, "<", 1, FilterOperandKind.Number),
        Op(FilterOperator.LessThanOrEqual, "≤", 1, FilterOperandKind.Number),
        Op(FilterOperator.Between, "is between", 2, FilterOperandKind.Number),
        .. Presence(),
        .. Tolerance()
    ];

    private static IEnumerable<FilterOperatorDefinition> BoolOperators() =>
    [
        Op(FilterOperator.IsTrue, "is true", 0, FilterOperandKind.None),
        Op(FilterOperator.IsFalse, "is false", 0, FilterOperandKind.None),
        .. Presence()
    ];

    private static IEnumerable<FilterOperatorDefinition> DateOperators() =>
    [
        Op(FilterOperator.Equals, "is on", 1, FilterOperandKind.Date),
        Op(FilterOperator.NotEquals, "is not on", 1, FilterOperandKind.Date),
        Op(FilterOperator.GreaterThan, "is after", 1, FilterOperandKind.Date),
        Op(FilterOperator.GreaterThanOrEqual, "is on or after", 1, FilterOperandKind.Date),
        Op(FilterOperator.LessThan, "is before", 1, FilterOperandKind.Date),
        Op(FilterOperator.LessThanOrEqual, "is on or before", 1, FilterOperandKind.Date),
        Op(FilterOperator.Between, "is between", 2, FilterOperandKind.Date),
        Op(FilterOperator.InLastDays, "is in the last (days)", 1, FilterOperandKind.Number),
        Op(FilterOperator.InNextDays, "is in the next (days)", 1, FilterOperandKind.Number),
        .. Presence()
    ];
}
