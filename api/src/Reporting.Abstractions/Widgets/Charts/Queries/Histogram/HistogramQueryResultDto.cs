namespace Reporting.Abstractions;

public class HistogramQueryResultDto : ScanCappedChartResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The bins, in ascending order — the shared category axis every series aligns to.</summary>
    public List<HistogramBinDto> Bins { get; set; } = new();
    public List<HistogramSeriesDto> Series { get; set; } = new();

    /// <summary>Values left out because they fell outside a fixed range.</summary>
    public int ExcludedCount { get; set; }

    /// <summary>Reference lines for the value (X) axis, resolved the same way as the other charts' bands.</summary>
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
