using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The display label for a series key, shared by bar, box-plot and histogram: with no series
/// column bound every row falls into one series whose key is "" — shown as the empty label the
/// client reads as "no series" — otherwise a blank key shows as "(blank)". A number or date series
/// column's key is its stored text, so it's formatted the way the column formats its cells.
/// </summary>
public static class SeriesLabels
{
    public static string Format(DatasetColumn? seriesColumn, string key)
    {
        if (seriesColumn is null)
        {
            return "";
        }
        if (key.Length == 0)
        {
            return "(blank)";
        }

        return seriesColumn.Type switch
        {
            DatasetColumnType.DateTime when CellValues.TryParseDate(key, out var date) =>
                CellFormatter.Date(date, seriesColumn.GetConfig() as DateColumnConfig),
            DatasetColumnType.Int or DatasetColumnType.Double when CellValues.TryParseNumber(key, out var number) =>
                CellFormatter.Number(number, seriesColumn.GetConfig() as NumericColumnConfig),
            _ => key
        };
    }
}
