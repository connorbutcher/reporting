using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// What the server insists of a viewing-filters value it stores (a user's saved filters or a shared
/// snapshot). The value is the front-end's own encoding and opaque here, but it must look like it — a
/// bounded run of URL-safe characters — so those columns can't be used to stash arbitrary text.
/// </summary>
public static class ViewFiltersFormat
{
    /// <summary>Throws a <see cref="DataValidationException"/> (a 400) unless <paramref name="filters"/> is a plausible encoding.</summary>
    public static void EnsureValid(string? filters)
    {
        if (string.IsNullOrEmpty(filters) || filters.Length > ReportViewState.MaxFiltersLength || !filters.All(IsUrlSafe))
        {
            throw new DataValidationException("The filters are not in a valid form.");
        }
    }

    private static bool IsUrlSafe(char c) =>
        c is (>= 'A' and <= 'Z') or (>= 'a' and <= 'z') or (>= '0' and <= '9') or '-' or '_';
}
