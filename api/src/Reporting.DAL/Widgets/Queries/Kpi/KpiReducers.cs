using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Pure reductions over whatever slice they're handed: the whole set, one period or one group.</summary>
internal static class KpiReducers
{
    /// <summary>Null when no value was present.</summary>
    public static double? ReduceAggregate(IReadOnlyList<double?> values, Aggregate aggregate)
    {
        var present = values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        if (present.Count == 0)
        {
            return null;
        }

        return aggregate switch
        {
            Aggregate.Sum => present.Sum(),
            Aggregate.Average => present.Average(),
            Aggregate.Min => present.Min(),
            Aggregate.Max => present.Max(),
            _ => present.Sum(),
        };
    }

    /// <summary>The count or percentage of rows failing the band. Null when no row had a value.</summary>
    public static double? ReduceTolerance(
        IReadOnlyList<DatasetRow> rows, KpiToleranceContext ctx, KpiToleranceStatusMode statusMode, bool showAsPercent)
    {
        var total = 0;
        var failing = 0;
        foreach (var row in rows)
        {
            if (row.Cells.FirstOrDefault(c => c.ColumnId == ctx.ValueColumn.Id)?.NumberValue is not { } value)
            {
                continue;
            }

            total++;
            if (IsFailing(ToleranceResolver.Classify(value, BoundsFor(row, ctx)), statusMode))
            {
                failing++;
            }
        }

        if (total == 0)
        {
            return null;
        }

        return showAsPercent ? 100.0 * failing / total : failing;
    }

    private static ToleranceBounds? BoundsFor(DatasetRow row, KpiToleranceContext ctx)
    {
        return ctx.MatchColumn is not null
            ? ctx.MatchedLimits!.For(row.Cells.FirstOrDefault(c => c.ColumnId == ctx.MatchColumn.Id))
            : ctx.FixedBounds;
    }

    private static bool IsFailing(ToleranceStatus status, KpiToleranceStatusMode statusMode)
    {
        return status == ToleranceStatus.Fail
            || (statusMode == KpiToleranceStatusMode.FailOrConcession && status == ToleranceStatus.Concession);
    }
}
