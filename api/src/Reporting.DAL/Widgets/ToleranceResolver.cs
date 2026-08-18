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
        IReadOnlyList<(TKey Key, int SourceDatasetId, Guid SourceRowId, Guid MinColumnId, Guid MaxColumnId,
            Guid? ConcessionLowerColumnId, Guid? ConcessionUpperColumnId)> pointers)
        where TKey : notnull
    {
        var result = new Dictionary<TKey, ToleranceBounds?>();
        if (pointers.Count == 0) return result;

        // A source dataset scopes its own row/column RefIds: those RefIds are preserved across a
        // revision's copies, so the same RefId exists in every version's copy of the dataset — the
        // dataset PK is what pins resolution to this revision's copy.
        var datasetIds = pointers.Select(p => p.SourceDatasetId).Distinct().ToList();
        var rowRefs = pointers.Select(p => p.SourceRowId).Distinct().ToList();
        var columnRefs = pointers
            .SelectMany(p => new[] { p.MinColumnId, p.MaxColumnId, p.ConcessionLowerColumnId, p.ConcessionUpperColumnId })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        // Pointers address the spec row and columns by their RefIds within a dataset; cells store int
        // ids, so resolve (datasetId, RefId) → int pk first and query cells by the int keys.
        var rowPkByRef = await db.DatasetRows
            .Where(r => datasetIds.Contains(r.DatasetId) && rowRefs.Contains(r.RefId))
            .Select(r => new { r.Id, r.DatasetId, r.RefId })
            .ToDictionaryAsync(r => (r.DatasetId, r.RefId), r => r.Id);
        var columnPkByRef = await db.DatasetColumns
            .Where(c => datasetIds.Contains(c.DatasetId) && columnRefs.Contains(c.RefId))
            .Select(c => new { c.Id, c.DatasetId, c.RefId })
            .ToDictionaryAsync(c => (c.DatasetId, c.RefId), c => c.Id);

        var rowPks = rowPkByRef.Values.ToList();
        var columnPks = columnPkByRef.Values.ToList();

        var cells = await db.DatasetCells
            .Where(c => rowPks.Contains(c.RowId) && columnPks.Contains(c.ColumnId))
            .Select(c => new { c.RowId, c.ColumnId, c.NumberValue })
            .ToListAsync();

        var byRowColumn = cells.ToDictionary(c => (c.RowId, c.ColumnId), c => c.NumberValue);

        double? Value(int datasetId, Guid rowRef, Guid columnRef) =>
            rowPkByRef.TryGetValue((datasetId, rowRef), out var rp)
            && columnPkByRef.TryGetValue((datasetId, columnRef), out var cp)
                ? byRowColumn.GetValueOrDefault((rp, cp))
                : null;

        foreach (var pointer in pointers)
        {
            var min = Value(pointer.SourceDatasetId, pointer.SourceRowId, pointer.MinColumnId);
            var max = Value(pointer.SourceDatasetId, pointer.SourceRowId, pointer.MaxColumnId);
            if (min is null || max is null)
            {
                result[pointer.Key] = null;
                continue;
            }

            var concessionLower = pointer.ConcessionLowerColumnId is { } clId
                ? Value(pointer.SourceDatasetId, pointer.SourceRowId, clId)
                : null;
            var concessionUpper = pointer.ConcessionUpperColumnId is { } cuId
                ? Value(pointer.SourceDatasetId, pointer.SourceRowId, cuId)
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
