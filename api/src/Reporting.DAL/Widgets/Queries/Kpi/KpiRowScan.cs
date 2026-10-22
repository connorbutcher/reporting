using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Tolerance classification and sparklines pull rows into memory, so those scans are capped.</summary>
internal static class KpiRowScan
{
    public const int MaxRows = ScanCapping.MaxScanRows;

    /// <summary>In row order, each row carrying only the cells in <paramref name="columnIds"/>.</summary>
    public static async Task<(List<DatasetRow> Rows, bool Truncated)> LoadAsync(IQueryable<DatasetRow> rows, ICollection<int> columnIds)
    {
        var scanned = new List<DatasetRow>();
        await foreach (var cells in RowCellStream.ReadAsync(rows, columnIds, MaxRows + 1))
        {
            scanned.Add(new DatasetRow { Cells = cells.Values.ToList() });
        }
        var truncated = ScanCapping.TrimToScanCap(scanned, MaxRows);
        return (scanned, truncated);
    }

    public static IQueryable<DatasetRow> WithDateWindow(
        IQueryable<DatasetRow> rows, int dateColumnId, DateTime startInclusive, DateTime endExclusive)
    {
        return rows.Where(r => r.Cells.Any(c => c.ColumnId == dateColumnId && c.DateValue >= startInclusive && c.DateValue < endExclusive));
    }
}
