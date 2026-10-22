namespace Reporting.Abstractions;

public class ChartQueryResultDto : ChartResultCountsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<ChartSeriesDto> Series { get; set; } = new();
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();

    /// <summary>Total rows that matched before the point cap; equals the plotted count when not truncated.</summary>
    public int TotalPoints { get; set; }

    /// <summary>True when more points matched than were returned, so the client can say the plot is a subset.</summary>
    public bool Truncated { get; set; }

    /// <summary>True when a truncated chart was thinned evenly across its X range rather than cut off.</summary>
    public bool Sampled { get; set; }
}
