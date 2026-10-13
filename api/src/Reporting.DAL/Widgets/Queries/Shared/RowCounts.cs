using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The dataset's row count and how many of those a filter matched — the pair behind every
/// chart's "N of M rows" footer.
/// </summary>
public static class RowCounts
{
    /// <summary>
    /// <see cref="Reporting.DAL.Filtering.FilterTranslator.Apply"/> hands back the very same query
    /// when no filter narrowed it, in which case a second COUNT would only repeat the first.
    /// </summary>
    public static async Task<(int Total, int Matched)> CountRowsAsync(
        IQueryable<DatasetRow> all, IQueryable<DatasetRow> matching)
    {
        var total = await all.CountAsync();
        var matched = ReferenceEquals(all, matching) ? total : await matching.CountAsync();
        return (total, matched);
    }
}
