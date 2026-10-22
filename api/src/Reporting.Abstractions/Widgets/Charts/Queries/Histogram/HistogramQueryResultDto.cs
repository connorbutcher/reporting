namespace Reporting.Abstractions;

public class HistogramQueryResultDto : ScanCappedChartResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>Ascending; every series aligns to these.</summary>
    public List<HistogramBinDto> Bins { get; set; } = new();
    public List<HistogramSeriesDto> Series { get; set; } = new();

    /// <summary>Values outside a fixed range.</summary>
    public int ExcludedCount { get; set; }

    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
