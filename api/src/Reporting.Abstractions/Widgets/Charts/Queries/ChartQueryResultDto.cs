namespace Reporting.Abstractions;

public class ChartQueryResultDto : ChartResultCountsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<ChartSeriesDto> Series { get; set; } = new();
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();

    /// <summary>Before the point cap.</summary>
    public int TotalPoints { get; set; }

    public bool Truncated { get; set; }

    /// <summary>Thinned evenly across X rather than cut off.</summary>
    public bool Sampled { get; set; }
}
