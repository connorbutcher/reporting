using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Each subgroup's mean and range need every value, so only the scalars are scanned, capped.</summary>
internal static class XBarRScan
{
    private const int MaxRows = ScanCapping.MaxScanRows;

    /// <summary>Only rows with a numeric measure feed a subgroup.</summary>
    public static async Task<(List<GroupedValueProjection> Projected, bool Truncated, int ScannedCount)> ValuesAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, int valueId)
    {
        var categoryId = reader.Column.Id;
        var scanned = await CellPivot.Of(matching, categoryId, valueId)
            .Where(p => p.N1 != null)
            .OrderBy(p => p.RowId)
            .Take(MaxRows + 1)
            .Select(p => new { p.T0, p.N0, p.D0, Value = p.N1 })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxRows);
        var projected = scanned
            .Select(r => new GroupedValueProjection
            {
                CategoryValue = reader.Read(r.T0, r.N0, r.D0),
                Value = r.Value ?? 0d
            })
            .ToList();
        return (projected, truncated, scanned.Count);
    }
}
