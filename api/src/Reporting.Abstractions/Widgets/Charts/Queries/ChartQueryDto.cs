namespace Reporting.Abstractions;

public class ChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }
    public Guid XColumnId { get; set; }
    public Guid YColumnId { get; set; }
    public Guid? SeriesColumnId { get; set; }

    /// <summary>Scales each point's marker by this numeric column's value — a scatter bubble chart.</summary>
    public Guid? SizeColumnId { get; set; }
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();

    /// <summary>Draw order for the returned points; null keeps the default X-ascending order.</summary>
    public ChartSort? Sort { get; set; }

    /// <summary>Fits a least-squares trend line per series, when both axes are numeric/date.</summary>
    public bool ShowTrendLine { get; set; }

    /// <summary>Reduces every row sharing an X value (per series) to one point; null plots the raw rows.</summary>
    public Aggregate? Aggregate { get; set; }

    /// <summary>Buckets a date X by period before aggregating; ignored without <see cref="Aggregate"/>.</summary>
    public DateGrouping? XGrouping { get; set; }
}
