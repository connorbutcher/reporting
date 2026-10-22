using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Plain aggregates (count, sum, average, min, max) reduced in SQL over every matched row, uncapped.</summary>
internal static class KpiSqlAggregates
{
    /// <summary>Null when no row has a number there, so the KPI shows no value rather than zero.</summary>
    public static async Task<BarStats?> ValuesAsync(IQueryable<DatasetRow> rows, int columnId)
    {
        var group = await rows
            .SelectMany(r => r.Cells)
            .Where(c => c.ColumnId == columnId && c.NumberValue != null)
            .GroupBy(_ => 1)
            .Select(g => new BarGroup
            {
                Count = g.Count(),
                Sum = g.Sum(c => c.NumberValue),
                Min = g.Min(c => c.NumberValue),
                Max = g.Max(c => c.NumberValue)
            })
            .FirstOrDefaultAsync();
        return group is null ? null : BarStats.From(group);
    }

    /// <summary>
    /// One GROUP BY on the group column's stored value, then groups that display the same (a number stored
    /// as "5" and "5.0") merged under that label.
    /// </summary>
    public static async Task<(List<KpiGroupResultDto> Groups, bool Truncated)> GroupsAsync(
        KpiQueryDto dto, IQueryable<DatasetRow> rows, DatasetColumn groupColumn, DatasetColumn? valueColumn)
    {
        var byLabel = await StatsByLabelAsync(rows, groupColumn, valueColumn);
        var maxGroups = Math.Clamp(dto.MaxGroups, 1, 200);
        var ordered = byLabel.OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase).ToList();

        var results = ordered
            .Take(maxGroups)
            .Select(entry => ToResult(dto, entry.Key, entry.Value.Rows, entry.Value.Stats, valueColumn))
            .ToList();
        return (results, ordered.Count > maxGroups);
    }

    private static async Task<Dictionary<string, (int Rows, BarStats Stats)>> StatsByLabelAsync(
        IQueryable<DatasetRow> rows, DatasetColumn groupColumn, DatasetColumn? valueColumn)
    {
        var groupId = groupColumn.Id;
        var grouped = await CellPivot.Of(rows, groupId, valueColumn?.Id ?? 0)
            .GroupBy(p => new { p.T0, p.N0, p.D0 })
            .Select(g => new
            {
                g.Key.T0,
                g.Key.N0,
                g.Key.D0,
                Rows = g.Count(),
                Stats = new BarGroup
                {
                    Count = g.Count(p => p.N1 != null),
                    Sum = g.Sum(p => p.N1),
                    Min = g.Min(p => p.N1),
                    Max = g.Max(p => p.N1)
                }
            })
            .ToListAsync();

        var byLabel = new Dictionary<string, (int Rows, BarStats Stats)>();
        foreach (var group in grouped)
        {
            var label = KpiGroups.Label(CellPivot.Cell(groupId, group.T0, group.N0, group.D0), groupColumn);
            var stats = BarStats.From(group.Stats);
            byLabel[label] = byLabel.TryGetValue(label, out var existing)
                ? (existing.Rows + group.Rows, existing.Stats.Merge(stats))
                : (group.Rows, stats);
        }
        return byLabel;
    }

    private static KpiGroupResultDto ToResult(KpiQueryDto dto, string label, int rows, BarStats stats, DatasetColumn? valueColumn)
    {
        double? value = dto.Aggregate == Aggregate.Count ? rows
            : valueColumn is null || stats.Count == 0 ? null
            : stats.Value(dto.Aggregate);
        return new KpiGroupResultDto
        {
            Label = label,
            Value = value,
            DisplayValue = KpiPresentation.Format(value, dto),
            Status = KpiPresentation.Status(value, dto),
        };
    }
}
