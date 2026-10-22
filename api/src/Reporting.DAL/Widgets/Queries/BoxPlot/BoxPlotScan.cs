using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Quartiles need every value, so only the (category, series, value) scalars are scanned, capped.</summary>
internal static class BoxPlotScan
{
    private const int MaxRows = ScanCapping.MaxScanRows;

    /// <summary>Only rows with a numeric measure feed a box. The needed cells are pivoted in one pass (<see cref="CellPivot"/>).</summary>
    public static async Task<(List<GroupedValueProjection> Projected, bool Truncated, int ScannedCount)> ValuesAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, int seriesId, int valueId)
    {
        var categoryId = reader.Column.Id;
        var scanned = await CellPivot.Of(matching, categoryId, seriesId, valueId)
            .Where(p => p.N2 != null)
            .OrderBy(p => p.RowId)
            .Take(MaxRows + 1)
            .Select(p => new { p.T0, p.N0, p.D0, Series = p.T1, Value = p.N2 })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxRows);
        var projected = scanned
            .Select(r => new GroupedValueProjection
            {
                CategoryValue = reader.Read(r.T0, r.N0, r.D0),
                Series = (r.Series ?? "").Trim(),
                Value = r.Value ?? 0d
            })
            .ToList();
        return (projected, truncated, scanned.Count);
    }
}
