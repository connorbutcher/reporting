using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Translates a condition on a numeric (Int/Double) column.</summary>
internal static class NumberConditionTranslator
{
    public static Expression<Func<DatasetRow, bool>> Translate(
        int id, DatasetColumn column, FilterOperator op, List<string> values)
    {
        var a = FilterValueParsing.ParseNumber(values.ElementAtOrDefault(0), column);

        return op switch
        {
            FilterOperator.Equals => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue == a),
            FilterOperator.NotEquals => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue != a),
            FilterOperator.GreaterThan => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue > a),
            FilterOperator.GreaterThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue >= a),
            FilterOperator.LessThan => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue < a),
            FilterOperator.LessThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue <= a),
            FilterOperator.Between =>
                Between(id, a, FilterValueParsing.ParseNumber(values.ElementAtOrDefault(1), column)),
            _ => throw new FilterException($"Operator '{op}' is not supported on numbers.")
        };
    }

    private static Expression<Func<DatasetRow, bool>> Between(int id, double from, double to)
    {
        // Tolerate the bounds being entered either way round.
        var (low, high) = from <= to ? (from, to) : (to, from);
        return r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue >= low && c.NumberValue <= high);
    }
}
