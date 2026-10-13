using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The display label for a category key, shared by box-plot and Xbar-R: a blank category shows
/// as "(blank)"; a date category's grouping key is its raw (ISO round-trip) input text — fine to
/// group by, but not to show — so the first parsed date per category is formatted instead of the
/// raw key.
/// </summary>
public static class CategoryLabels
{
    public static string Format(
        string key,
        IReadOnlyDictionary<string, DateTime?>? categoryDates,
        DateColumnConfig? categoryDateConfig)
    {
        if (key.Length == 0)
        {
            return "(blank)";
        }

        if (categoryDates is not null && categoryDates.TryGetValue(key, out var date) && date is { } value)
        {
            return CellFormatter.Date(value, categoryDateConfig);
        }

        return key;
    }
}
