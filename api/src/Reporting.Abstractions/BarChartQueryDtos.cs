namespace Reporting.Abstractions;

public class BarChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The column whose distinct values become the bars (any type).</summary>
    public Guid CategoryColumnId { get; set; }

    /// <summary>The numeric column the aggregate reduces. Ignored — and may be empty — for Count.</summary>
    public Guid? ValueColumnId { get; set; }

    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>Splits each category into a bar per distinct value. Null yields one bar per category.</summary>
    public Guid? SeriesColumnId { get; set; }

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();
}

public class BarSeriesDto
{
    /// <summary>Resolved series key, "(blank)" already applied. Empty when there's no series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>One entry per category in <see cref="BarChartQueryResultDto.Categories"/> order; null where this series has no rows in that category.</summary>
    public List<double?> Values { get; set; } = new();
}

public class BarChartQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The bar categories, in display order — the shared X axis every series aligns to.</summary>
    public List<string> Categories { get; set; } = new();
    public List<BarSeriesDto> Series { get; set; } = new();

    /// <summary>Reference lines for the value axis, resolved the same way as scatter/line bands.</summary>
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
