namespace Reporting.Abstractions;

public class BoxPlotQueryResultDto : ScanCappedChartResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>In display order; every series aligns to these.</summary>
    public List<string> Categories { get; set; } = new();
    public List<BoxPlotSeriesDto> Series { get; set; } = new();

    /// <summary>Aligned with <see cref="Categories"/>.</summary>
    public List<ChartCategoryDto> CategoryDetails { get; set; } = new();

    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
