using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

internal static class BarTooltips
{
    /// <summary>Each tooltip column's reduced value with its prefix and suffix, blanks skipped.</summary>
    public static List<string> Lines(List<BarTooltipStats> tooltipStats, string category, string series, Aggregate aggregate)
    {
        var lines = new List<string>();
        foreach (var (setting, column, stats) in tooltipStats)
        {
            if (stats.TryGetValue((category, series), out var s) && s.Value(aggregate) is { } value)
            {
                var formatted = CellFormatter.Number(value, column.GetConfig() as NumericColumnConfig);
                lines.Add($"{setting.Prefix}{formatted}{setting.Suffix}");
            }
        }
        return lines;
    }
}
