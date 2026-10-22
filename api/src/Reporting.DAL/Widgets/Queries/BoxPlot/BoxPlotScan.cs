using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Quartiles need every value, so only the (category, series, value) scalars are scanned, capped.</summary>
internal static class BoxPlotScan
{
    private const int MaxRows = 200_000;

    /// <summary>Only rows with a numeric measure feed a box. The category's three typed forms come back in one subquery.</summary>
    public static async Task<(List<GroupedValueProjection> Projected, bool Truncated, int ScannedCount)> ValuesAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, int seriesId, int valueId)
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
                Series = r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
            })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxRows);
        var projected = scanned
            .Select(r => new GroupedValueProjection
            {
                CategoryValue = reader.Read(r.Category?.StringValue, r.Category?.NumberValue, r.Category?.DateValue),
                Series = (r.Series ?? "").Trim(),
                Value = r.Value ?? 0d
            })
            .ToList();
        return (projected, truncated, scanned.Count);
    }
}
