using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class PointSampling
{
    /// <summary>
    /// The ids of <paramref name="count"/> rows spread evenly along X, first and last included, so a time
    /// series keeps its whole span. Reads just each row's id and X.
    /// </summary>
    public static async Task<List<int>> EvenIdsAsync(IQueryable<DatasetRow> rows, int xId, DatasetColumnType? xType, int count)
    {
        var keyed = await rows
            .Select(r => new
            {
                r.Id,
                X = r.Cells.Where(c => c.ColumnId == xId).Select(c => new { c.StringValue, c.NumberValue, c.DateValue }).FirstOrDefault()
            })
            .ToListAsync();

        var ordered = xType switch
        {
            DatasetColumnType.String => keyed.OrderBy(r => r.X?.StringValue, StringComparer.OrdinalIgnoreCase).ThenBy(r => r.Id).Select(r => r.Id).ToList(),
            DatasetColumnType.DateTime => keyed.OrderBy(r => r.X?.DateValue).ThenBy(r => r.Id).Select(r => r.Id).ToList(),
            _ => keyed.OrderBy(r => r.X?.NumberValue).ThenBy(r => r.Id).Select(r => r.Id).ToList()
        };
        if (ordered.Count <= count)
        {
            return ordered;
        }

        var step = (double)(ordered.Count - 1) / (count - 1);
        return Enumerable.Range(0, count).Select(i => ordered[(int)Math.Round(i * step)]).Distinct().ToList();
    }
}
