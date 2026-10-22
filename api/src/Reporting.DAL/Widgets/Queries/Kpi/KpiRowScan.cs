using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Every row must be pulled into memory to aggregate or classify it, so scans are capped.</summary>
internal static class KpiRowScan
{
    public const int MaxRows = 200_000;

    public static async Task<(List<DatasetRow> Rows, bool Truncated)> LoadAsync(IQueryable<DatasetRow> rows, HashSet<int> columnIds)
    {
        var scanned = await rows
            .OrderBy(r => r.Id)
            .Take(MaxRows + 1)
            .Include(r => r.Cells.Where(c => columnIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();
        var truncated = ScanCapping.TrimToScanCap(scanned, MaxRows);
        return (scanned, truncated);
    }

    public static IQueryable<DatasetRow> WithDateWindow(
        IQueryable<DatasetRow> rows, int dateColumnId, DateTime startInclusive, DateTime endExclusive)
    {
        return rows.Where(r => r.Cells.Any(c => c.ColumnId == dateColumnId && c.DateValue >= startInclusive && c.DateValue < endExclusive));
    }
}
