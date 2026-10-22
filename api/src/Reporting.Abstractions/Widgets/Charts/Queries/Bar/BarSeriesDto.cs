namespace Reporting.Abstractions;

public class BarSeriesDto
{
    /// <summary>Resolved series key from the split (colour-by) column, "(blank)" already applied. Empty when there's no series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Which measure this series reduces, when several value columns are plotted; null for Count. Lets the client label a measure's series.</summary>
    public Guid? ValueColumnId { get; set; }

    /// <summary>The measure column's display name, so the client can label multi-measure series without its schema; empty for Count.</summary>
    public string ValueColumnLabel { get; set; } = string.Empty;

    /// <summary>One entry per category in <see cref="BarChartQueryResultDto.Categories"/> order; null where this series has no rows in that category.</summary>
    public List<double?> Values { get; set; } = new();

    /// <summary>How many rows fed each bar, aligned with <see cref="Values"/>; null where there's no bar.</summary>
    public List<int?> RowCounts { get; set; } = new();

    /// <summary>Each bar's formatted tooltip column lines, aligned with <see cref="Values"/>; empty when none were requested.</summary>
    public List<List<string>> TooltipLines { get; set; } = new();

    /// <summary>Conditions selecting this series' rows (its split value), for drill-through; null with no split.</summary>
    public FilterGroupDto? Drill { get; set; }
}
