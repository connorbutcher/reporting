namespace Reporting.Abstractions;

public class BoxPlotQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>Any type.</summary>
    public Guid CategoryColumnId { get; set; }

    public Guid ValueColumnId { get; set; }

    public Guid? SeriesColumnId { get; set; }

    public BoxWhisker Whisker { get; set; } = BoxWhisker.Tukey;

    /// <summary>Of the IQR for Tukey, of the standard deviation for StdDev.</summary>
    public double WhiskerFactor { get; set; } = 1.5;

    public ChartSort Sort { get; set; } = new();

    /// <summary>Adds a capped sample of raw values to each box.</summary>
    public bool IncludePoints { get; set; }

    /// <summary>Null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Averaged over each box's rows.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();
}
