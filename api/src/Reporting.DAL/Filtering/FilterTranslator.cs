using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Why a filter couldn't be translated, for a 400 rather than a silent mismatch.</summary>
public sealed class FilterException(string message) : Exception(message);

/// <summary>
/// Turns a filter tree into an <see cref="Expression"/> predicate over
/// <see cref="DatasetRow"/>. Every condition is an ordinary lambda over the row's
/// cells, which EF translates to an indexed EXISTS — so the only expression-tree
/// work here is combining predicates for AND/OR groups.
/// </summary>
public static class FilterTranslator
{
    public static Expression<Func<DatasetRow, bool>>? Build(
        FilterNodeDto? node,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById) =>
        node is null ? null : Translate(node, columnsById);

    private static Expression<Func<DatasetRow, bool>>? Translate(
        FilterNodeDto node,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById) => node switch
    {
        FilterGroupDto group => TranslateGroup(group, columnsById),
        FilterConditionDto condition => TranslateCondition(condition, columnsById),
        _ => throw new FilterException("Unknown filter node.")
    };

    private static Expression<Func<DatasetRow, bool>>? TranslateGroup(
        FilterGroupDto group,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById)
    {
        var parts = group.Children
            .Select(child => Translate(child, columnsById))
            .Where(p => p is not null)
            .Cast<Expression<Func<DatasetRow, bool>>>()
            .ToList();

        // An empty group filters nothing, rather than matching nothing — a
        // half-built filter in the panel shouldn't blank the table.
        if (parts.Count == 0) return null;

        var combined = parts[0];
        for (var i = 1; i < parts.Count; i++)
        {
            combined = group.Join == FilterJoin.Or
                ? Combine(combined, parts[i], Expression.OrElse)
                : Combine(combined, parts[i], Expression.AndAlso);
        }
        return combined;
    }

    private static Expression<Func<DatasetRow, bool>> Combine(
        Expression<Func<DatasetRow, bool>> left,
        Expression<Func<DatasetRow, bool>> right,
        Func<Expression, Expression, BinaryExpression> join)
    {
        // Both lambdas declare their own parameter; rebind the right one onto the
        // left's so the combined body refers to a single row parameter.
        var parameter = left.Parameters[0];
        var rebound = new ParameterRebinder(right.Parameters[0], parameter).Visit(right.Body);
        return Expression.Lambda<Func<DatasetRow, bool>>(join(left.Body, rebound), parameter);
    }

    private sealed class ParameterRebinder(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == from ? to : base.VisitParameter(node);
    }

    // --- conditions ---------------------------------------------------------

    private static Expression<Func<DatasetRow, bool>> TranslateCondition(
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
            DatasetColumnType.Int or DatasetColumnType.Double => Number(id, column, condition.Operator, values),
            DatasetColumnType.Bool => Bool(id, condition.Operator),
            DatasetColumnType.DateTime => Date(id, column, condition.Operator, values),
            _ => Text(id, condition.Operator, values)
        };
    }

    private static Expression<Func<DatasetRow, bool>> Number(
        int id,
        DatasetColumn column,
        FilterOperator op,
        List<string> values)
    {
        var a = ParseNumber(values.ElementAtOrDefault(0), column);

        return op switch
        {
            FilterOperator.Equals => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue == a),
            FilterOperator.NotEquals => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue != a),
            FilterOperator.GreaterThan => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue > a),
            FilterOperator.GreaterThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue >= a),
            FilterOperator.LessThan => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue < a),
            FilterOperator.LessThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue <= a),
            FilterOperator.Between => BetweenNumber(id, a, ParseNumber(values.ElementAtOrDefault(1), column)),
            _ => throw new FilterException($"Operator '{op}' is not supported on numbers.")
        };
    }

    private static Expression<Func<DatasetRow, bool>> BetweenNumber(int id, double from, double to)
    {
        // Tolerate the bounds being entered either way round.
        var (low, high) = from <= to ? (from, to) : (to, from);
        return r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue >= low && c.NumberValue <= high);
    }

    private static Expression<Func<DatasetRow, bool>> Bool(int id, FilterOperator op) => op switch
    {
        FilterOperator.IsTrue => r => r.Cells.Any(c => c.ColumnId == id && c.BoolValue == true),
        FilterOperator.IsFalse => r => r.Cells.Any(c => c.ColumnId == id && c.BoolValue == false),
        _ => throw new FilterException($"Operator '{op}' is not supported on true/false columns.")
    };

    private static Expression<Func<DatasetRow, bool>> Date(
        int id,
        DatasetColumn column,
        FilterOperator op,
        List<string> values)
    {
        // Relative operators resolve to a fixed instant here so a constant, not a
        // clock call, reaches SQL.
        if (op is FilterOperator.InLastDays or FilterOperator.InNextDays)
        {
            var days = ParseNumber(values.ElementAtOrDefault(0), column);
            var today = DateTime.UtcNow.Date;
            if (op == FilterOperator.InLastDays)
            {
                var from = today.AddDays(-Math.Abs(days));
                return r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= from && c.DateValue <= today);
            }

            var to = today.AddDays(Math.Abs(days));
            return r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= today && c.DateValue <= to);
        }

        var a = ParseDate(values.ElementAtOrDefault(0), column);

        return op switch
        {
            // A date operand with no time means the whole of that day.
            FilterOperator.Equals => OnDay(id, a, negate: false),
            FilterOperator.NotEquals => OnDay(id, a, negate: true),
            FilterOperator.GreaterThan => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue > a),
            FilterOperator.GreaterThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= a),
            FilterOperator.LessThan => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue < a),
            FilterOperator.LessThanOrEqual => r => r.Cells.Any(c => c.ColumnId == id && c.DateValue <= a),
            FilterOperator.Between => BetweenDate(id, a, ParseDate(values.ElementAtOrDefault(1), column)),
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

    private static Expression<Func<DatasetRow, bool>> BetweenDate(int id, DateTime from, DateTime to)
    {
        var (low, high) = from <= to ? (from, to) : (to, from);
        // The upper bound is inclusive of the whole day the user picked.
        var end = high.Date.AddDays(1);
        var start = low.Date;
        return r => r.Cells.Any(c => c.ColumnId == id && c.DateValue >= start && c.DateValue < end);
    }

    private static Expression<Func<DatasetRow, bool>> Text(int id, FilterOperator op, List<string> values)
    {
        var raw = values.ElementAtOrDefault(0) ?? string.Empty;

        switch (op)
        {
            case FilterOperator.Equals:
                return r => r.Cells.Any(c => c.ColumnId == id && c.StringValue == raw);
            case FilterOperator.NotEquals:
                return r => !r.Cells.Any(c => c.ColumnId == id && c.StringValue == raw);
            case FilterOperator.In:
            {
                // One operand holding a comma-separated list, or several operands.
                var candidates = values.Count > 1 ? values : raw.Split(',').ToList();
                var options = candidates
                    .Select(v => v.Trim())
                    .Where(v => v.Length > 0)
                    .ToList();
                if (options.Count == 0) throw new FilterException("'is any of' needs at least one value.");
                return r => r.Cells.Any(c => c.ColumnId == id && c.StringValue != null && options.Contains(c.StringValue));
            }
        }

        var pattern = op switch
        {
            FilterOperator.Contains or FilterOperator.NotContains => $"%{Escape(raw)}%",
            FilterOperator.StartsWith => $"{Escape(raw)}%",
            FilterOperator.EndsWith => $"%{Escape(raw)}",
            _ => throw new FilterException($"Operator '{op}' is not supported on text.")
        };

        return op == FilterOperator.NotContains
            ? r => !r.Cells.Any(c => c.ColumnId == id && c.StringValue != null && EF.Functions.Like(c.StringValue, pattern, "\\"))
            : r => r.Cells.Any(c => c.ColumnId == id && c.StringValue != null && EF.Functions.Like(c.StringValue, pattern, "\\"));
    }

    /// <summary>Keeps LIKE wildcards typed by the user from acting as wildcards.</summary>
    private static string Escape(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    private static double ParseNumber(string? raw, DatasetColumn column) =>
        CellValues.TryParseNumber(raw, out var value)
            ? value
            : throw new FilterException($"'{raw}' is not a number, which '{column.Name}' needs.");

    private static DateTime ParseDate(string? raw, DatasetColumn column) =>
        CellValues.TryParseDate(raw, out var value)
            ? value
            : throw new FilterException($"'{raw}' is not a date, which '{column.Name}' needs.");
}
