using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>
/// Translates the tolerance operators into numeric range predicates over the column's resolved bounds,
/// mirroring <see cref="ToleranceResolver.Classify"/>: in spec is [Min, Max], the concession band
/// is the amber shoulder each side, and out of tolerance is beyond the widest allowed bound.
/// </summary>
internal static class ToleranceConditionTranslator
{
    public static bool IsTolerance(FilterOperator op) =>
        op is FilterOperator.InTolerance or FilterOperator.NeedsConcession or FilterOperator.OutOfTolerance;

    /// <returns>Null when no banding is resolved for the column: the check can't be evaluated, so it narrows nothing rather than blanking the data.</returns>
    public static Expression<Func<DatasetRow, bool>>? Translate(FilterConditionDto condition, TranslationContext context)
    {
        var column = context.Column(condition.ColumnId);
        if (column.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
        {
            throw new FilterException(
                $"A tolerance filter needs a numeric column, but '{column.Name}' is {column.Type}.");
        }

        if (context.ToleranceByColumn is null
            || !context.ToleranceByColumn.TryGetValue(condition.ColumnId, out var bounds)
            || bounds is null)
        {
            return null;
        }

        var id = column.Id;
        var min = bounds.Min;
        var max = bounds.Max;

        return condition.Operator switch
        {
            FilterOperator.InTolerance =>
                r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue >= min && c.NumberValue <= max),
            FilterOperator.OutOfTolerance => OutOfTolerance(id, bounds),
            FilterOperator.NeedsConcession => Concession(id, bounds),
            _ => throw new FilterException($"Operator '{condition.Operator}' is not a tolerance check.")
        };
    }

    /// <summary>Beyond the widest allowed bound: the concession bound where there is one, else spec.</summary>
    private static Expression<Func<DatasetRow, bool>> OutOfTolerance(int id, ToleranceBounds bounds)
    {
        var low = bounds.ConcessionLower ?? bounds.Min;
        var high = bounds.ConcessionUpper ?? bounds.Max;
        return r => r.Cells.Any(c => c.ColumnId == id && (c.NumberValue < low || c.NumberValue > high));
    }

    /// <summary>The amber shoulder: outside [Min, Max] but within a concession bound, per side.</summary>
    private static Expression<Func<DatasetRow, bool>> Concession(int id, ToleranceBounds bounds)
    {
        var min = bounds.Min;
        var max = bounds.Max;

        if (bounds.ConcessionLower is { } lower && bounds.ConcessionUpper is { } upper)
        {
            return r => r.Cells.Any(c => c.ColumnId == id
                && ((c.NumberValue >= lower && c.NumberValue < min)
                    || (c.NumberValue > max && c.NumberValue <= upper)));
        }

        if (bounds.ConcessionLower is { } lo)
        {
            return r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue >= lo && c.NumberValue < min);
        }

        if (bounds.ConcessionUpper is { } hi)
        {
            return r => r.Cells.Any(c => c.ColumnId == id && c.NumberValue > max && c.NumberValue <= hi);
        }

        // No concession band, so nothing can be in concession.
        return _ => false;
    }
}
