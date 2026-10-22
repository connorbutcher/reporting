namespace Reporting.Abstractions;

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
