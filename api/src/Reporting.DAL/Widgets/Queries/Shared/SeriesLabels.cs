using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The display label for a series key, shared by bar, box-plot and histogram: with no series
/// column bound every row falls into one series whose key is "" — shown as the empty label the
/// client reads as "no series" — otherwise a blank key shows as "(blank)".
/// </summary>
public static class SeriesLabels
{
    public static string Format(DatasetColumn? seriesColumn, string key)
    {
        if (seriesColumn is null)
        {
            return "";
        }

        return key.Length == 0 ? "(blank)" : key;
    }
}
