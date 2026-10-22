using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

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
        if (pointers.Count == 0)
        {
            return result;
        }

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

        var lookup = new SpecCellLookup(rowPkByRef, columnPkByRef, cells.ToDictionary(c => (c.RowId, c.ColumnId), c => c.NumberValue));

        foreach (var pointer in pointers)
        {
            var min = lookup.Value(pointer.SourceDatasetId, pointer.SourceRowId, pointer.MinColumnId);
            var max = lookup.Value(pointer.SourceDatasetId, pointer.SourceRowId, pointer.MaxColumnId);
            if (min is null || max is null)
            {
                result[pointer.Key] = null;
                continue;
            }

            var concessionLower = pointer.ConcessionLowerColumnId is { } clId
                ? lookup.Value(pointer.SourceDatasetId, pointer.SourceRowId, clId)
                : null;
            var concessionUpper = pointer.ConcessionUpperColumnId is { } cuId
                ? lookup.Value(pointer.SourceDatasetId, pointer.SourceRowId, cuId)
                : null;

            result[pointer.Key] = new ToleranceBounds(min.Value, max.Value, concessionLower, concessionUpper);
        }

        return result;
    }

    /// <summary>
    /// Resolves limits that are chosen per data row: for each spec, every row of its limits dataset
    /// with its bounds, indexed by the value in the spec's match column. Looked up per data row with
    /// <see cref="MatchedLimits.For"/>. A limits dataset is a spec table (rows of limits), so it is
    /// read whole — just the match, min, max and concession columns — rather than queried per row.
    /// </summary>
    public async Task<Dictionary<TKey, MatchedLimits>> ResolveMatchedAsync<TKey>(
        IReadOnlyList<(TKey Key, int SourceDatasetId, Guid MatchColumnId, Guid MinColumnId, Guid MaxColumnId,
            Guid? ConcessionLowerColumnId, Guid? ConcessionUpperColumnId)> specs)
        where TKey : notnull
    {
        var result = new Dictionary<TKey, MatchedLimits>();
        foreach (var spec in specs)
        {
            result[spec.Key] = await LoadMatchedAsync(spec.SourceDatasetId, spec.MatchColumnId, spec.MinColumnId,
                spec.MaxColumnId, spec.ConcessionLowerColumnId, spec.ConcessionUpperColumnId);
        }
        return result;
    }

    private async Task<MatchedLimits> LoadMatchedAsync(
        int datasetId, Guid matchRef, Guid minRef, Guid maxRef, Guid? lowerRef, Guid? upperRef)
    {
        var wanted = new[] { matchRef, minRef, maxRef, lowerRef, upperRef }
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var columnPkByRef = await db.DatasetColumns
            .Where(c => c.DatasetId == datasetId && wanted.Contains(c.RefId))
            .Select(c => new { c.Id, c.RefId })
            .ToDictionaryAsync(c => c.RefId, c => c.Id);

        // A pointer to a column that no longer exists resolves to no limits at all, so nothing is highlighted.
        if (!columnPkByRef.TryGetValue(matchRef, out var matchPk)
            || !columnPkByRef.TryGetValue(minRef, out var minPk)
            || !columnPkByRef.TryGetValue(maxRef, out var maxPk))
        {
            return MatchedLimits.Empty;
        }
        int? lowerPk = lowerRef is { } l && columnPkByRef.TryGetValue(l, out var lp) ? lp : null;
        int? upperPk = upperRef is { } u && columnPkByRef.TryGetValue(u, out var up) ? up : null;

        var columnPks = columnPkByRef.Values.ToList();
        var cells = await db.DatasetCells
            .Where(c => c.Row!.DatasetId == datasetId && columnPks.Contains(c.ColumnId))
            .OrderBy(c => c.RowId)
            .Select(c => new LimitCell(c.RowId, c.ColumnId, c.StringValue, c.NumberValue, c.DateValue))
            .ToListAsync();

        var byKey = new Dictionary<string, ToleranceBounds>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in cells.GroupBy(c => c.RowId))
        {

            var keyCell = row.FirstOrDefault(c => c.ColumnId == matchPk);
            var key = keyCell is null ? null : MatchKey(keyCell.StringValue, keyCell.NumberValue, keyCell.DateValue);
            var min = Number(row, minPk);
            var max = Number(row, maxPk);
            // A limits row with no identifier, or without both bounds, can't be matched to anything.
            // Rows arrive in id order, so where several share an identifier the first one wins.
            if (key is null || min is null || max is null || byKey.ContainsKey(key))
            {
                continue;
            }

            byKey[key] = new ToleranceBounds(min.Value, max.Value, Number(row, lowerPk), Number(row, upperPk));
        }

        return new MatchedLimits(byKey);
    }

    private static double? Number(IEnumerable<LimitCell> row, int? columnPk)
    {
        return columnPk is { } pk ? row.FirstOrDefault(c => c.ColumnId == pk)?.NumberValue : null;
    }

    /// <summary>
    /// The identifier a cell is matched on: a number by its value (so 1001 and 1001.0 agree), a date
    /// by its instant, otherwise the trimmed text — compared ignoring case. Null for a blank cell.
    /// </summary>
    public static string? MatchKey(string? text, double? number, DateTime? date)
    {
        if (number is { } n)
        {
            return n.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
        }

        if (date is { } d)
        {
            return d.ToString("O", System.Globalization.CultureInfo.InvariantCulture);
        }

        var trimmed = text?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    /// <summary>Red below/above a concession bound, amber within the concession band, else in-spec.</summary>
    public static ToleranceStatus Classify(double value, ToleranceBounds? bounds)
    {
        if (bounds is null)
        {
            return ToleranceStatus.None;
        }

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
