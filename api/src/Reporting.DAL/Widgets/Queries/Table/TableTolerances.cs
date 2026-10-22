using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The requested columns' tolerance bands, keyed by column RefId: one fixed band per column, or for a matching
/// column a table of limits picked per row. Tolerance filter operators need one band, so they read only
/// <see cref="Bounds"/>.
/// </summary>
internal sealed record TableTolerances(Dictionary<Guid, ToleranceBounds?> Bounds, Dictionary<Guid, MatchedLimits> MatchedLimits)
{
    public static async Task<TableTolerances> ResolveAsync(ToleranceResolver tolerance, List<DataTableColumnSetting> columns)
    {
        var pointers = columns
            .Where(c => c.Tolerance is { SourceRowId: not null, Match: null })
            .Select(c => (
                Key: c.ColumnId,
                c.Tolerance!.SourceDatasetId,
                SourceRowId: c.Tolerance.SourceRowId!.Value,
                c.Tolerance.MinColumnId,
                c.Tolerance.MaxColumnId,
                c.Tolerance.ConcessionLowerColumnId,
                c.Tolerance.ConcessionUpperColumnId))
            .ToList();
        var bounds = await tolerance.ResolveAsync(pointers);

        var matchSpecs = columns
            .Where(c => c.Tolerance is { Match: not null })
            .Select(c => (
                Key: c.ColumnId,
                c.Tolerance!.SourceDatasetId,
                MatchColumnId: c.Tolerance.Match!.SourceColumnId,
                c.Tolerance.MinColumnId,
                c.Tolerance.MaxColumnId,
                c.Tolerance.ConcessionLowerColumnId,
                c.Tolerance.ConcessionUpperColumnId))
            .ToList();
        var matchedLimits = await tolerance.ResolveMatchedAsync(matchSpecs);

        return new TableTolerances(bounds, matchedLimits);
    }
}
