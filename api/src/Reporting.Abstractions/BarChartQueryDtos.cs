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

public class BarChartQueryResultDto : ChartResultCountsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The bar categories, in display order — the shared X axis every series aligns to.</summary>
    public List<string> Categories { get; set; } = new();
    public List<BarSeriesDto> Series { get; set; } = new();

    /// <summary>One entry per category, in the same order: its natural sort key and drill-through conditions.</summary>
    public List<ChartCategoryDto> CategoryDetails { get; set; } = new();

    /// <summary>Reference lines for the value axis, resolved the same way as scatter/line bands.</summary>
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
