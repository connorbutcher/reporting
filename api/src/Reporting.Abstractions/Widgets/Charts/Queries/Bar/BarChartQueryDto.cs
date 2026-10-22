namespace Reporting.Abstractions;

public class BarChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>Any type.</summary>
    public Guid CategoryColumnId { get; set; }

    /// <summary>Deprecated; folded into <see cref="ValueColumnIds"/> when that is empty.</summary>
    public Guid? ValueColumnId { get; set; }

    /// <summary>One series each. Ignored for Count.</summary>
    public List<Guid> ValueColumnIds { get; set; } = new();

    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    public Guid? SeriesColumnId { get; set; }

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    public ChartSort Sort { get; set; } = new();

    /// <summary>Null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Reduced per bar by the same aggregate (Count sums).</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
}
