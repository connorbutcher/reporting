namespace Reporting.DAL.Widgets;

/// <summary>
/// The category column's own order, shared by box-plot and Xbar-R: numerically/chronologically for
/// numeric and date columns (blanks, whose sort key is null, sink to the end), alphabetically
/// otherwise.
/// </summary>
public static class CategoryOrdering
{
    public static List<string> NaturalOrder(List<GroupedValueProjection> projected, bool numeric, bool date)
    {
        if (!numeric && !date)
        {
            return projected.Select(p => p.Category).Distinct().OrderBy(category => category, StringComparer.OrdinalIgnoreCase).ToList();
        }

        return projected
            .GroupBy(p => p.Category)
            .Select(g => new
            {
                Category = g.Key,
                Sort = numeric ? g.Min(item => item.SortNumber)
                    : g.Min(item => item.SortDate)?.Ticks
            })
            .OrderBy(c => c.Sort ?? double.MaxValue)
            .Select(c => c.Category)
            .ToList();
    }

    /// <summary>
    /// A date category's grouping key is its raw (ISO round-trip) input text — fine to group by,
    /// but not to show — so the first parsed date per category is kept here to format the
    /// displayed label from, instead of the raw key. Null when the category isn't a date column.
    /// </summary>
    public static Dictionary<string, DateTime?>? CategoryDates(List<GroupedValueProjection> projected, bool date)
    {
        if (!date)
        {
            return null;
        }

        return projected.GroupBy(p => p.Category).ToDictionary(g => g.Key, g => g.Min(item => item.SortDate));
    }
}
