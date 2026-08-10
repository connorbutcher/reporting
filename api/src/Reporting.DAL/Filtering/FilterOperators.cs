using Reporting.Abstractions;

namespace Reporting.DAL.Filtering;

/// <summary>
/// Which operators each column type supports, and what operands each one needs.
/// Served to the client so the filter panel and server-side validation can never
/// disagree about what is offerable.
/// </summary>
public static class FilterOperators
{
    private static FilterOperatorDto Op(
        FilterOperator value,
        string label,
        int operandCount = 1,
        FilterOperandKind kind = FilterOperandKind.Text) =>
        new() { Value = value, Label = label, OperandCount = operandCount, OperandKind = kind };

    /// <summary>Presence checks, meaningful for every type.</summary>
    private static IEnumerable<FilterOperatorDto> Presence() =>
    [
        Op(FilterOperator.IsEmpty, "is empty", 0, FilterOperandKind.None),
        Op(FilterOperator.IsNotEmpty, "is not empty", 0, FilterOperandKind.None)
    ];

    private static readonly FilterOperatorDto[] StringOperators =
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

    private static readonly FilterOperatorDto[] NumberOperators =
    [
        Op(FilterOperator.Equals, "=", 1, FilterOperandKind.Number),
        Op(FilterOperator.NotEquals, "≠", 1, FilterOperandKind.Number),
        Op(FilterOperator.GreaterThan, ">", 1, FilterOperandKind.Number),
        Op(FilterOperator.GreaterThanOrEqual, "≥", 1, FilterOperandKind.Number),
        Op(FilterOperator.LessThan, "<", 1, FilterOperandKind.Number),
        Op(FilterOperator.LessThanOrEqual, "≤", 1, FilterOperandKind.Number),
        Op(FilterOperator.Between, "is between", 2, FilterOperandKind.Number),
        .. Presence()
    ];

    private static readonly FilterOperatorDto[] BoolOperators =
    [
        Op(FilterOperator.IsTrue, "is true", 0, FilterOperandKind.None),
        Op(FilterOperator.IsFalse, "is false", 0, FilterOperandKind.None),
        .. Presence()
    ];

    private static readonly FilterOperatorDto[] DateOperators =
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

    public static IReadOnlyList<FilterOperatorDto> For(DatasetColumnType type) => type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double => NumberOperators,
        DatasetColumnType.Bool => BoolOperators,
        DatasetColumnType.DateTime => DateOperators,
        _ => StringOperators
    };

    public static FilterOperatorDto? Find(DatasetColumnType type, FilterOperator op) =>
        For(type).FirstOrDefault(o => o.Value == op);

    public static List<FilterOperatorsForTypeDto> Catalogue() =>
        Enum.GetValues<DatasetColumnType>()
            .Select(type => new FilterOperatorsForTypeDto
            {
                Type = type,
                Operators = For(type).ToList()
            })
            .ToList();
}
