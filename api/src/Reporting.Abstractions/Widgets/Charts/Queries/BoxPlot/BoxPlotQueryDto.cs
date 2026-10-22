namespace Reporting.Abstractions;

public class BoxPlotQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The column whose distinct values become the boxes (any type).</summary>
    public Guid CategoryColumnId { get; set; }

    /// <summary>The numeric column whose per-category distribution each box summarises.</summary>
    public Guid ValueColumnId { get; set; }

    /// <summary>Splits each category into a box per distinct value. Null yields one box per category.</summary>
    public Guid? SeriesColumnId { get; set; }

    /// <summary>Where the whiskers end, and whether outliers are drawn beyond them.</summary>
    public BoxWhisker Whisker { get; set; } = BoxWhisker.Tukey;

    /// <summary>The whisker length multiplier — of the IQR for Tukey, of the standard deviation for StdDev.</summary>
    public double WhiskerFactor { get; set; } = 1.5;

    /// <summary>How the boxes are ordered along the category axis.</summary>
    public ChartSort Sort { get; set; } = new();

    /// <summary>When set, each box also carries a (capped) sample of its raw values for a jittered overlay.</summary>
    public bool IncludePoints { get; set; }

    /// <summary>Buckets a date category by period; null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Extra numeric columns averaged over each box's rows, for its tooltip.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();
}
