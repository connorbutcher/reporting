namespace Reporting.Abstractions;

public class ChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }
    public Guid XColumnId { get; set; }
    public Guid YColumnId { get; set; }
    public Guid? SeriesColumnId { get; set; }

    /// <summary>Bubble size.</summary>
    public Guid? SizeColumnId { get; set; }
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();

    /// <summary>Null keeps X ascending.</summary>
    public ChartSort? Sort { get; set; }

    public bool ShowTrendLine { get; set; }

    /// <summary>Reduces rows sharing an X value to one point; null plots the raw rows.</summary>
    public Aggregate? Aggregate { get; set; }

    /// <summary>Ignored without <see cref="Aggregate"/>.</summary>
    public DateGrouping? XGrouping { get; set; }
}
