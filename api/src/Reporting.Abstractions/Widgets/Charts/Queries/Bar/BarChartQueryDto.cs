namespace Reporting.Abstractions;

public class BarChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The column whose distinct values become the bars (any type).</summary>
    public Guid CategoryColumnId { get; set; }

    /// <summary>
    /// Deprecated single measure — kept so an older caller still resolves. Prefer
    /// <see cref="ValueColumnIds"/>; when that is empty this is folded into it.
    /// </summary>
    public Guid? ValueColumnId { get; set; }

    /// <summary>
    /// The numeric columns the aggregate reduces, each plotted as its own series (grouped
    /// or stacked). Empty — and ignored — for Count, which counts rows. When empty the
    /// deprecated <see cref="ValueColumnId"/> is folded in as the single measure.
    /// </summary>
    public List<Guid> ValueColumnIds { get; set; } = new();

    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>Splits each category into a bar per distinct value. Null yields one bar per category.</summary>
    public Guid? SeriesColumnId { get; set; }

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>How the bars are ordered along the category axis.</summary>
    public ChartSort Sort { get; set; } = new();

    /// <summary>Buckets a date category by period; null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Numeric columns reduced per bar by the same aggregate (Count sums) and shown in its tooltip.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
}
