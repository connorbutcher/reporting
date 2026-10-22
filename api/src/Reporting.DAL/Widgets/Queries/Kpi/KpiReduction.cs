using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>What a KPI reduces its rows with: the tolerance band, or the value column for a non-count aggregate.</summary>
internal sealed record KpiReduction(KpiQueryDto Dto, KpiToleranceContext? Tolerance, DatasetColumn? ValueColumn)
{
    /// <summary>The columns a scan must load cells for, alongside <paramref name="keyColumnId"/>.</summary>
    public HashSet<int> NeededColumnIds(int keyColumnId)
    {
        var ids = new HashSet<int> { keyColumnId };
        if (ValueColumn is not null)
        {
            ids.Add(ValueColumn.Id);
        }
        if (Tolerance is { } ctx)
        {
            ids.Add(ctx.ValueColumn.Id);
            if (ctx.MatchColumn is not null)
            {
                ids.Add(ctx.MatchColumn.Id);
            }
        }
        return ids;
    }

    /// <summary>One period's or group's value, reduced the same way as the single value.</summary>
    public double? Reduce(IReadOnlyList<DatasetRow> rows)
    {
        if (Dto.ValueSource == KpiValueSource.ToleranceOutOfLimits)
        {
            return Tolerance is { } ctx ? KpiReducers.ReduceTolerance(rows, ctx, Dto.ToleranceStatusMode, Dto.ShowAsPercent) : null;
        }

        if (Dto.Aggregate == Aggregate.Count)
        {
            return rows.Count;
        }

        if (ValueColumn is null)
        {
            return null;
        }

        var values = rows.Select(r => r.Cells.FirstOrDefault(c => c.ColumnId == ValueColumn.Id)?.NumberValue).ToList();
        return KpiReducers.ReduceAggregate(values, Dto.Aggregate);
    }
}
