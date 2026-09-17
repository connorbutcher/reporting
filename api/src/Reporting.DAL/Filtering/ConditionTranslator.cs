using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>
/// Translates an ordinary (non-tolerance) condition into a predicate: validates the operator and
/// its operand count against the server's own <see cref="FilterOperators"/> catalogue, then
/// dispatches to the translator for the column's type.
/// </summary>
internal static class ConditionTranslator
{
    public static Expression<Func<DatasetRow, bool>> Translate(
        FilterConditionDto condition,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById)
    {
        if (!columnsById.TryGetValue(condition.ColumnId, out var column))
        {
            throw new FilterException($"Column {condition.ColumnId} is not part of this dataset.");
        }

        var descriptor = FilterOperators.Find(column.Type, condition.Operator)
            ?? throw new FilterException(
                $"Operator '{condition.Operator}' cannot be used on the {column.Type} column '{column.Name}'.");

        var values = condition.Values ?? [];
        if (descriptor.OperandKind != FilterOperandKind.List && values.Count < descriptor.OperandCount)
        {
            throw new FilterException($"'{descriptor.Label}' on '{column.Name}' needs {descriptor.OperandCount} value(s).");
        }

        // Cells store the column's int id; the client addressed the column by its RefId, so match
        // against the resolved column's primary key.
        var id = column.Id;

        // Presence checks are type-independent and read off the text form.
        switch (condition.Operator)
        {
            case FilterOperator.IsEmpty:
                return r => !r.Cells.Any(c => c.ColumnId == id && c.StringValue != null && c.StringValue != "");
            case FilterOperator.IsNotEmpty:
                return r => r.Cells.Any(c => c.ColumnId == id && c.StringValue != null && c.StringValue != "");
        }

        return column.Type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double =>
                NumberConditionTranslator.Translate(id, column, condition.Operator, values),
            DatasetColumnType.Bool => Bool(id, condition.Operator),
            DatasetColumnType.DateTime => DateConditionTranslator.Translate(id, column, condition.Operator, values),
            _ => TextConditionTranslator.Translate(id, condition.Operator, values)
        };
    }

    private static Expression<Func<DatasetRow, bool>> Bool(int id, FilterOperator op) => op switch
    {
        FilterOperator.IsTrue => r => r.Cells.Any(c => c.ColumnId == id && c.BoolValue == true),
        FilterOperator.IsFalse => r => r.Cells.Any(c => c.ColumnId == id && c.BoolValue == false),
        _ => throw new FilterException($"Operator '{op}' is not supported on true/false columns.")
    };
}
