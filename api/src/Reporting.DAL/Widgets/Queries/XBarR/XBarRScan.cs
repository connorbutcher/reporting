using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Each subgroup's mean and range need every value, so only the scalars are scanned, capped.</summary>
internal static class XBarRScan
{
    private const int MaxRows = 200_000;

    /// <summary>Only rows with a numeric measure feed a subgroup.</summary>
    public static async Task<(List<GroupedValueProjection> Projected, bool Truncated, int ScannedCount)> ValuesAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, int valueId)
    {
        var categoryId = reader.Column.Id;
        var scanned = await matching
            .Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null))
            .OrderBy(r => r.Id)
            .Take(MaxRows + 1)
            .Select(r => new
            {
                Category = r.Cells
                    .Where(c => c.ColumnId == categoryId)
                    .Select(c => new { c.StringValue, c.NumberValue, c.DateValue })
                    .FirstOrDefault(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
            })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxRows);
        var projected = scanned
            .Select(r => new GroupedValueProjection
            {
                CategoryValue = reader.Read(r.Category?.StringValue, r.Category?.NumberValue, r.Category?.DateValue),
                Value = r.Value ?? 0d
            })
            .ToList();
        return (projected, truncated, scanned.Count);
    }
}
