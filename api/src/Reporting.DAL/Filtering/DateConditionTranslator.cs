using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Translates a condition on a DateTime column.</summary>
internal static class DateConditionTranslator
{
    public static Expression<Func<DatasetRow, bool>> Translate(
        int id, DatasetColumn column, FilterOperator op, List<string> values)
    {
        // Relative operators resolve to a fixed instant here so a constant, not a
        // clock call, reaches SQL.
        if (op is FilterOperator.InLastDays or FilterOperator.InNextDays)
        {
            var days = FilterValueParsing.ParseNumber(values.ElementAtOrDefault(0), column);
            var today = DateTime.UtcNow.Date;
            if (op == FilterOperator.InLastDays)
            {
                var from = today.AddDays(-Math.Abs(days));
                return r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= from && c.DateValue <= today);
            }

            var to = today.AddDays(Math.Abs(days));
            return r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= today && c.DateValue <= to);
        }

        var a = FilterValueParsing.ParseDate(values.ElementAtOrDefault(0), column);

        return op switch
        {
            // A date operand with no time means the whole of that day.
            FilterOperator.Equals => OnDay(id, a, negate: false),
            FilterOperator.NotEquals => OnDay(id, a, negate: true),
            FilterOperator.GreaterThan => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue > a),
            FilterOperator.GreaterThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= a),
            FilterOperator.LessThan => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue < a),
            FilterOperator.LessThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue <= a),
            FilterOperator.Between =>
                Between(id, a, FilterValueParsing.ParseDate(values.ElementAtOrDefault(1), column)),
            _ => throw new FilterException($"Operator '{op}' is not supported on dates.")
        };
    }

    private static Expression<Func<DatasetRow, bool>> OnDay(int id, DateTime day, bool negate)
    {
        var start = day.Date;
        var end = start.AddDays(1);
        return negate
            ? r => !r.Cells.Any(c => c.ColumnId == id && c.DateValue >= start && c.DateValue < end)
            : r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= start && c.DateValue < end);
    }

    private static Expression<Func<DatasetRow, bool>> Between(int id, DateTime from, DateTime to)
    {
        var (low, high) = from <= to ? (from, to) : (to, from);
        // The upper bound is inclusive of the whole day the user picked.
        var end = high.Date.AddDays(1);
        var start = low.Date;
        return r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= start && c.DateValue < end);
    }
}
