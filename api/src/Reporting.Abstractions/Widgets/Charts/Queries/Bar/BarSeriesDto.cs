namespace Reporting.Abstractions;

public class BarSeriesDto
{
    /// <summary>The split value, "(blank)" applied. Empty without a series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Null for Count.</summary>
    public Guid? ValueColumnId { get; set; }

    /// <summary>Empty for Count.</summary>
    public string ValueColumnLabel { get; set; } = string.Empty;

    /// <summary>Aligned with the categories; null where the series has no rows.</summary>
    public List<double?> Values { get; set; } = new();

    /// <summary>Aligned with <see cref="Values"/>.</summary>
    public List<int?> RowCounts { get; set; } = new();

    /// <summary>Aligned with <see cref="Values"/>.</summary>
    public List<List<string>> TooltipLines { get; set; } = new();

    /// <summary>Selects this series' rows for drill-through; null with no split.</summary>
    public FilterGroupDto? Drill { get; set; }
}
