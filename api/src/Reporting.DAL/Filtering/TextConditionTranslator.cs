using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Translates a condition on a string (or otherwise untyped) column.</summary>
internal static class TextConditionTranslator
{
    public static Expression<Func<DatasetRow, bool>> Translate(int id, FilterOperator op, List<string> values)
    {
        var raw = values.ElementAtOrDefault(0) ?? string.Empty;

        switch (op)
        {
            case FilterOperator.Equals:
                return r => r.Cells.Any(c => c.ColumnId == id && c.StringValue == raw);
            case FilterOperator.NotEquals:
                return r => !r.Cells.Any(c => c.ColumnId == id && c.StringValue == raw);
            case FilterOperator.In:
                return In(id, values, raw);
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

    private static Expression<Func<DatasetRow, bool>> In(int id, List<string> values, string raw)
    {
        // One operand holding a comma-separated list, or several operands.
        var candidates = values.Count > 1 ? values : raw.Split(',').ToList();
        var options = candidates.Select(v => v.Trim()).Where(v => v.Length > 0).ToList();
        if (options.Count == 0) throw new FilterException("'is any of' needs at least one value.");
        return r => r.Cells.Any(c => c.ColumnId == id && c.StringValue != null && options.Contains(c.StringValue));
    }

    /// <summary>Keeps LIKE wildcards typed by the user from acting as wildcards.</summary>
    private static string Escape(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
