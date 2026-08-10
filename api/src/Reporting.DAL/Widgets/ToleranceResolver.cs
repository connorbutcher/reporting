using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A tolerance band's four bounds, resolved to concrete numbers.</summary>
public record ToleranceBounds(double Min, double Max, double? ConcessionLower, double? ConcessionUpper);

/// <summary>
/// Resolves tolerance pointers (spec row + min/max/concession column ids) against
/// the typed <see cref="DatasetCell.NumberValue"/> already stored for those cells —
/// no re-parsing, and no need to load the whole limits dataset the pointer targets.
/// </summary>
public class ToleranceResolver(ReportingDbContext db)
{
    /// <summary>
    /// Resolves many pointers in one query, keyed by whatever the caller wants to
    /// address them by (a table's column id, or a chart band's client-generated id).
    /// </summary>
    public async Task<Dictionary<TKey, ToleranceBounds?>> ResolveAsync<TKey>(
        IReadOnlyList<(TKey Key, Guid SourceRowId, Guid MinColumnId, Guid MaxColumnId,
            Guid? ConcessionLowerColumnId, Guid? ConcessionUpperColumnId)> pointers)
        where TKey : notnull
    {
        var result = new Dictionary<TKey, ToleranceBounds?>();
        if (pointers.Count == 0) return result;

        var rowIds = pointers.Select(p => p.SourceRowId).Distinct().ToList();
        var columnIds = pointers
            .SelectMany(p => new[] { p.MinColumnId, p.MaxColumnId, p.ConcessionLowerColumnId, p.ConcessionUpperColumnId })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var cells = await db.DatasetCells
            .Where(c => rowIds.Contains(c.RowId) && columnIds.Contains(c.ColumnId))
            .Select(c => new { c.RowId, c.ColumnId, c.NumberValue })
            .ToListAsync();

        var byRowColumn = cells.ToDictionary(c => (c.RowId, c.ColumnId), c => c.NumberValue);

        foreach (var pointer in pointers)
        {
            var min = byRowColumn.GetValueOrDefault((pointer.SourceRowId, pointer.MinColumnId));
            var max = byRowColumn.GetValueOrDefault((pointer.SourceRowId, pointer.MaxColumnId));
            if (min is null || max is null)
            {
                result[pointer.Key] = null;
                continue;
            }

            var concessionLower = pointer.ConcessionLowerColumnId is { } clId
                ? byRowColumn.GetValueOrDefault((pointer.SourceRowId, clId))
                : null;
            var concessionUpper = pointer.ConcessionUpperColumnId is { } cuId
                ? byRowColumn.GetValueOrDefault((pointer.SourceRowId, cuId))
                : null;

            result[pointer.Key] = new ToleranceBounds(min.Value, max.Value, concessionLower, concessionUpper);
        }

        return result;
    }

    /// <summary>Red below/above a concession bound, amber within the concession band, else in-spec.</summary>
    public static ToleranceStatus Classify(double value, ToleranceBounds? bounds)
    {
        if (bounds is null) return ToleranceStatus.None;

        if (value < bounds.Min)
        {
            return bounds.ConcessionLower is { } lower && value >= lower
                ? ToleranceStatus.Concession
                : ToleranceStatus.Fail;
        }

        if (value > bounds.Max)
        {
            return bounds.ConcessionUpper is { } upper && value <= upper
                ? ToleranceStatus.Concession
                : ToleranceStatus.Fail;
        }

        return ToleranceStatus.Pass;
    }
}
