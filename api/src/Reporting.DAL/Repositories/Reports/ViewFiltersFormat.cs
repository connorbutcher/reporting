using System.Buffers;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// What the server requires of viewing filters it stores: opaque to it, but a bounded run of URL-safe
/// characters, so the columns can't be used to stash arbitrary text.
/// </summary>
public static class ViewFiltersFormat
{
    private static readonly SearchValues<char> UrlSafe =
        SearchValues.Create("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_");

    /// <exception cref="DataValidationException">Not a plausible encoding (a 400).</exception>
    public static void EnsureValid(string? filters)
    {
        if (string.IsNullOrEmpty(filters)
            || filters.Length > ReportViewState.MaxFiltersLength
            || filters.AsSpan().ContainsAnyExcept(UrlSafe))
        {
            throw new DataValidationException("The filters are not in a valid form.");
        }
    }
}
