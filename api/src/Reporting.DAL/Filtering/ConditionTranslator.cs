using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>
/// Translates an ordinary (non-tolerance) condition: validates the operator and operand count against
/// the <see cref="FilterOperators"/> catalogue, then dispatches by column type.
/// </summary>
internal static class ConditionTranslator
{
    public static Expression<Func<DatasetRow, bool>> Translate(FilterConditionDto condition, TranslationContext context)
    {
        var column = context.Column(condition.ColumnId);

        var descriptor = FilterOperators.Find(column.Type, condition.Operator, context.OperatorCatalogue)
            ?? throw new FilterException(
                $"Operator '{condition.Operator}' cannot be used on the {column.Type} column '{column.Name}'.");

        var values = condition.Values ?? [];
        if (descriptor.OperandKind != FilterOperandKind.List && values.Count < descriptor.OperandCount)
        {
            throw new FilterException($"'{descriptor.Label}' on '{column.Name}' needs {descriptor.OperandCount} value(s).");
        }

        // Cells store the column's int id; the client addressed it by RefId.
        var id = column.Id;

        // Presence checks are type-independent and read the text form.
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
