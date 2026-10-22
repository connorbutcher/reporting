namespace Reporting.Abstractions;

/// <summary>One dataset's series on a chart. Each binding is queried separately and merged on the client.</summary>
public class ChartSeriesBinding
{
    /// <summary>Client-generated editor id.</summary>
    public string Id { get; set; } = string.Empty;

    public int? DatasetId { get; set; }

    public Guid? XColumnId { get; set; }
    public Guid? YColumnId { get; set; }

    /// <summary>Bubble size column. Scatter only.</summary>
    public Guid? SizeColumnId { get; set; }

    /// <summary>A bar chart's measures, one series each. <see cref="YColumnId"/> mirrors the first for older readers.</summary>
    public List<Guid>? ValueColumnIds { get; set; }

    public Guid? SeriesColumnId { get; set; }

    /// <summary>Client-only, combination charts: "bar" or "line"; null means bars.</summary>
    public string? RenderAs { get; set; }

    /// <summary>Null, or an id no longer on the chart, uses the primary value axis.</summary>
    public string? YAxisId { get; set; }

    public string? Color { get; set; }

    /// <summary>circle/rect/triangle/diamond/none; null uses the chart kind's default.</summary>
    public string? Symbol { get; set; }

    /// <summary>solid/dashed/dotted; null draws solid.</summary>
    public string? DashStyle { get; set; }

    /// <summary>Blank falls back to the dataset/column name.</summary>
    public string Label { get; set; } = string.Empty;

    public FilterGroupDto? Filter { get; set; }

    /// <summary>Point charts only: per-binding row order. Grouping charts use their chart-level Sort.</summary>
    public ChartSort? Sort { get; set; }
}
