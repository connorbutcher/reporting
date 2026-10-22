using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The sparkline: one value per <see cref="KpiQueryDto.PeriodDays"/>-wide period going back
/// <see cref="KpiQueryDto.SparklinePeriods"/>, oldest first, from one scan bucketed in memory.
/// </summary>
internal static class KpiHistory
{
    public static async Task<List<KpiHistoryPointDto>> BuildAsync(
        KpiReduction reduction, IQueryable<DatasetRow> matching, DatasetColumn dateColumn, DateTime today)
    {
        var dto = reduction.Dto;
        var periods = Math.Clamp(dto.SparklinePeriods, 1, 52);
        var earliestStart = today.AddDays(-periods * dto.PeriodDays);
        var windowed = KpiRowScan.WithDateWindow(matching, dateColumn.Id, earliestStart, today.AddDays(1));
        var (scanned, _) = await KpiRowScan.LoadAsync(windowed, reduction.NeededColumnIds(dateColumn.Id));

        var buckets = Bucket(scanned, dateColumn, today, dto.PeriodDays, periods);
        return Points(buckets, reduction, today, periods);
    }

    /// <summary>Index 0 is the most recent period, counting up further back.</summary>
    private static Dictionary<int, List<DatasetRow>> Bucket(
        List<DatasetRow> rows, DatasetColumn dateColumn, DateTime today, int periodDays, int periods)
    {
        var buckets = new Dictionary<int, List<DatasetRow>>();
        foreach (var row in rows)
        {
            if (row.Cells.FirstOrDefault(c => c.ColumnId == dateColumn.Id)?.DateValue is not { } date)
            {
                continue;
            }
            var index = (int)Math.Floor((today - date).TotalDays / periodDays);
            if (index < 0 || index >= periods)
            {
                continue;
            }
            if (!buckets.TryGetValue(index, out var bucketRows))
            {
                buckets[index] = bucketRows = new List<DatasetRow>();
            }
            bucketRows.Add(row);
        }
        return buckets;
    }

    private static List<KpiHistoryPointDto> Points(
        Dictionary<int, List<DatasetRow>> buckets, KpiReduction reduction, DateTime today, int periods)
    {
        var points = new List<KpiHistoryPointDto>(periods);
        for (var index = periods - 1; index >= 0; index--)
        {
            var periodStart = today.AddDays(-(index + 1) * reduction.Dto.PeriodDays);
            var value = buckets.TryGetValue(index, out var bucketRows) ? reduction.Reduce(bucketRows) : null;
            points.Add(new KpiHistoryPointDto { PeriodStart = periodStart, Value = value });
        }
        return points;
    }
}
